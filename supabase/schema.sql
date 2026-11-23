-- Game Theory Event schema. Run once in the Supabase SQL editor.
-- Phones (publishable key) can only READ game/teams/participants.
-- All writes go through Next server actions using the secret key.

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create table if not exists participants (
  id uuid primary key,
  name text not null,
  team_id uuid references teams(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists game (
  id int primary key default 1 check (id = 1),
  phase int not null default 0,              -- bumped on every transition; guards double/stale advances
  stage text not null default 'lobby',
  question_id text,
  dialogue_index int not null default 0,
  presenting_team_id uuid references teams(id) on delete set null,
  presented_team_ids uuid[] not null default '{}',
  submitted_team_ids uuid[] not null default '{}',
  voted_team_ids uuid[] not null default '{}',
  phase_ends_at timestamptz,
  paused_remaining_ms int,
  finished_question_ids text[] not null default '{}',
  show_extra boolean not null default false
);
insert into game (id) values (1) on conflict do nothing;

create table if not exists submissions (
  question_id text not null,
  team_id uuid not null references teams(id) on delete cascade,
  choice int,
  number int,
  explanation text not null default '',
  locked boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (question_id, team_id)
);

create table if not exists votes (
  question_id text not null,
  presenting_team_id uuid not null references teams(id) on delete cascade,
  voter_team_id uuid not null references teams(id) on delete cascade,
  score int not null check (score between 0 and 10),
  primary key (question_id, presenting_team_id, voter_team_id)
);

-- RLS: public read on 3 tables; submissions/votes have no policies => invisible to phones.
alter table teams enable row level security;
alter table participants enable row level security;
alter table game enable row level security;
alter table submissions enable row level security;
alter table votes enable row level security;

drop policy if exists "public read" on teams;
drop policy if exists "public read" on participants;
drop policy if exists "public read" on game;
create policy "public read" on teams for select to anon, authenticated using (true);
create policy "public read" on participants for select to anon, authenticated using (true);
create policy "public read" on game for select to anon, authenticated using (true);

-- Atomic array appends (avoid lost updates when teams submit/vote at the same moment)
create or replace function mark_submitted(t uuid) returns void language sql as $$
  update game set submitted_team_ids = array_append(submitted_team_ids, t)
  where id = 1 and not (t = any(submitted_team_ids));
$$;
create or replace function mark_voted(t uuid) returns void language sql as $$
  update game set voted_team_ids = array_append(voted_team_ids, t)
  where id = 1 and not (t = any(voted_team_ids));
$$;
revoke execute on function mark_submitted(uuid) from public, anon, authenticated;
revoke execute on function mark_voted(uuid) from public, anon, authenticated;
grant execute on function mark_submitted(uuid) to service_role;
grant execute on function mark_voted(uuid) to service_role;

-- 2B Cooperate or Defect: head-to-head matches. Public table = resolved rounds only.
create table if not exists matches (
  id int primary key,
  a uuid not null references teams(id) on delete cascade,
  b uuid not null references teams(id) on delete cascade,
  round int not null default 1,                -- next round to play; > rounds means the match is over
  a_moves int[] not null default '{}',         -- revealed history, 0 = cooperate, 1 = defect
  b_moves int[] not null default '{}',
  a_score int not null default 0,
  b_score int not null default 0,
  a_ready boolean not null default false,      -- chose this round (the choice itself stays private)
  b_ready boolean not null default false
);
-- Pending (unrevealed) choices: no policy => invisible to phones and to realtime.
create table if not exists match_moves (
  match_id int not null references matches(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  choice int not null check (choice in (0, 1)),
  primary key (match_id, team_id)
);
alter table matches enable row level security;
alter table match_moves enable row level security;
drop policy if exists "public read" on matches;
create policy "public read" on matches for select to anon, authenticated using (true);

-- One move, atomically. Locks the game row (so the stage can't close mid-move) and the match row
-- (so both teams / several phones can't race). Resolves the round once both teams have chosen.
create or replace function pd_move(t uuid, r int, c int, rounds int) returns text language plpgsql as $$
declare
  m matches;
  ca int;
  cb int;
  pay int[] := array[[3, 0], [5, 1]];          -- pay[mine + 1][theirs + 1]
begin
  if c not in (0, 1) then return 'bad choice'; end if;
  perform 1 from game where id = 1 and stage = 'matches' for share;
  if not found then return 'closed'; end if;
  select * into m from matches where a = t or b = t for update;
  if not found then return 'no match'; end if;
  if m.round > rounds then return 'over'; end if;
  if m.round <> r then return 'stale'; end if;
  insert into match_moves (match_id, team_id, choice) values (m.id, t, c)
    on conflict (match_id, team_id) do update set choice = excluded.choice;
  select choice into ca from match_moves where match_id = m.id and team_id = m.a;
  select choice into cb from match_moves where match_id = m.id and team_id = m.b;
  if ca is null or cb is null then
    update matches set a_ready = ca is not null, b_ready = cb is not null where id = m.id;
  else
    update matches set
      a_moves = a_moves || ca, b_moves = b_moves || cb,
      a_score = a_score + pay[ca + 1][cb + 1], b_score = b_score + pay[cb + 1][ca + 1],
      round = round + 1, a_ready = false, b_ready = false
    where id = m.id;
    delete from match_moves where match_id = m.id;
  end if;
  return 'ok';
end $$;
revoke execute on function pd_move(uuid, int, int, int) from public, anon, authenticated;
grant execute on function pd_move(uuid, int, int, int) to service_role;

-- Realtime only for the public tables
do $$ begin
  alter publication supabase_realtime add table game, teams, participants;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table matches;
exception when duplicate_object then null;
end $$;
