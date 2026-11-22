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

-- Realtime only for the public tables
do $$ begin
  alter publication supabase_realtime add table game, teams, participants;
exception when duplicate_object then null;
end $$;
