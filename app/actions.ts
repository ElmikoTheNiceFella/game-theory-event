"use server";

import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { ANSWERS, SURGEON_TABLE } from "@/lib/answers";
import { questionById, TEAM_COLORS } from "@/lib/questions";
import { scoreQuestion, twoThirds } from "@/lib/scoring";
import {
  ANSWER_SECONDS,
  PRESENT_SECONDS,
  VOTE_SECONDS,
  type Game,
  type Stage,
  type Submission,
  type Team,
  type Vote,
} from "@/lib/types";

type Res = { ok?: true; error?: string };

/* ---------------- helpers (not exported) ---------------- */

const COOKIE = "gte_org";
const pinHash = (pin: string) => createHash("sha256").update(pin).digest("hex");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireOrganizer() {
  const pin = process.env.ORGANIZER_PIN;
  const c = (await cookies()).get(COOKIE)?.value;
  if (!pin || c !== pinHash(pin)) throw new Error("Not authorized");
}

async function getGame(): Promise<Game> {
  const { data, error } = await db.from("game").select("*").eq("id", 1).single();
  if (error) throw error;
  return data as Game;
}

async function getTeams(): Promise<Team[]> {
  const { data, error } = await db.from("teams").select("*").order("created_at");
  if (error) throw error;
  return data as Team[];
}

async function getParticipant(pid: string) {
  if (!UUID.test(pid)) return null;
  const { data } = await db.from("participants").select("*").eq("id", pid).maybeSingle();
  return data as { id: string; name: string; team_id: string | null } | null;
}

const endsIn = (s: number) => new Date(Date.now() + s * 1000).toISOString();

/** Atomic: only applies if nobody else advanced the game since `phase` was read. */
async function transition(phase: number, patch: Partial<Game>) {
  const { data, error } = await db
    .from("game")
    .update({ ...patch, phase: phase + 1 })
    .eq("id", 1)
    .eq("phase", phase)
    .select("phase");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

function revealPatch(g: Game): Partial<Game> {
  const q = g.question_id!;
  return {
    stage: "reveal",
    presenting_team_id: null,
    phase_ends_at: null,
    paused_remaining_ms: null,
    finished_question_ids: g.finished_question_ids.includes(q) ? g.finished_question_ids : [...g.finished_question_ids, q],
  };
}

async function nextPresenterPatch(g: Game): Promise<Partial<Game>> {
  const left = (await getTeams()).map((t) => t.id).filter((id) => !g.presented_team_ids.includes(id));
  if (!left.length) return revealPatch(g);
  const t = left[Math.floor(Math.random() * left.length)];
  return {
    stage: "presenting",
    presenting_team_id: t,
    presented_team_ids: [...g.presented_team_ids, t],
    voted_team_ids: [],
    phase_ends_at: endsIn(PRESENT_SECONDS),
    paused_remaining_ms: null,
  };
}

/** Timed transitions: answering → presenting → voting → presenting … → reveal */
async function advanceFrom(phase: number) {
  const g = await getGame();
  if (g.phase !== phase) return;
  if (g.stage === "answering" || g.stage === "voting") await transition(phase, await nextPresenterPatch(g));
  else if (g.stage === "presenting")
    await transition(phase, { stage: "voting", voted_team_ids: [], phase_ends_at: endsIn(VOTE_SECONDS), paused_remaining_ms: null });
}

const fail = (error: string): Res => ({ error });

/* ---------------- organizer ---------------- */

export async function organizerLogin(pin: string): Promise<Res> {
  const real = process.env.ORGANIZER_PIN;
  if (!real) return fail("ORGANIZER_PIN is not set on the server");
  const a = Buffer.from(pinHash(String(pin))),
    b = Buffer.from(pinHash(real));
  if (!timingSafeEqual(a, b)) return fail("Wrong PIN");
  (await cookies()).set(COOKIE, pinHash(real), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  return { ok: true };
}

export async function amOrganizer() {
  try {
    await requireOrganizer();
    return true;
  } catch {
    return false;
  }
}

export async function addTeam(name: string): Promise<Res> {
  await requireOrganizer();
  const n = String(name).trim().slice(0, 30);
  if (!n) return fail("Team name required");
  const teams = await getTeams();
  const { error } = await db.from("teams").insert({ name: n, color: TEAM_COLORS[teams.length % TEAM_COLORS.length] });
  return error ? fail(error.message) : { ok: true };
}

export async function removeTeam(id: string): Promise<Res> {
  await requireOrganizer();
  const { error } = await db.from("teams").delete().eq("id", id);
  return error ? fail(error.message) : { ok: true };
}

const SIMPLE: Partial<Record<Stage, Stage[]>> = {
  lobby: ["rules"],
  rules: ["lobby", "select"],
  reveal: ["leaderboard", "finale"],
  leaderboard: ["finale"],
  finale: ["final"],
};

/** Manual stage changes. Going to "select" from mid-question aborts it (its partial data is wiped). */
export async function goTo(phase: number, to: Stage): Promise<Res> {
  await requireOrganizer();
  const g = await getGame();
  if (g.phase !== phase) return fail("Game moved on, try again");
  const allowed = SIMPLE[g.stage]?.includes(to) || (to === "select" && g.stage !== "select" && g.stage !== "lobby");
  if (!allowed) return fail(`Can't go from ${g.stage} to ${to}`);
  if (to === "select" && g.question_id && !g.finished_question_ids.includes(g.question_id)) {
    await db.from("submissions").delete().eq("question_id", g.question_id);
    await db.from("votes").delete().eq("question_id", g.question_id);
  }
  const patch: Partial<Game> = { stage: to, phase_ends_at: null, paused_remaining_ms: null };
  if (to === "select") Object.assign(patch, { question_id: null, presenting_team_id: null });
  await transition(phase, patch);
  return { ok: true };
}

export async function startQuestion(phase: number, qid: string): Promise<Res> {
  await requireOrganizer();
  const g = await getGame();
  if (g.phase !== phase || g.stage !== "select") return fail("Not on question select");
  if (!questionById(qid)) return fail("Unknown question");
  if (g.finished_question_ids.includes(qid)) return fail("Already played");
  await db.from("submissions").delete().eq("question_id", qid);
  await db.from("votes").delete().eq("question_id", qid);
  await transition(phase, {
    stage: "dialogue",
    question_id: qid,
    dialogue_index: 0,
    presenting_team_id: null,
    presented_team_ids: [],
    submitted_team_ids: [],
    voted_team_ids: [],
    show_extra: false,
    phase_ends_at: null,
    paused_remaining_ms: null,
  });
  return { ok: true };
}

export async function dialogueStep(phase: number, delta: 1 | -1): Promise<Res> {
  await requireOrganizer();
  const g = await getGame();
  const q = questionById(g.question_id);
  if (g.phase !== phase || g.stage !== "dialogue" || !q) return fail("Not in dialogue");
  const i = g.dialogue_index + delta;
  if (i < 0) return { ok: true };
  if (i >= q.dialogue.length)
    await transition(phase, { stage: "answering", phase_ends_at: endsIn(ANSWER_SECONDS), paused_remaining_ms: null });
  else await transition(phase, { dialogue_index: i });
  return { ok: true };
}

/** Called by the host when a timer hits 0, or by "End now". */
export async function advance(phase: number): Promise<Res> {
  await requireOrganizer();
  await advanceFrom(phase);
  return { ok: true };
}

export async function skipToReveal(phase: number): Promise<Res> {
  await requireOrganizer();
  const g = await getGame();
  if (g.phase !== phase || !["answering", "presenting", "voting"].includes(g.stage)) return fail("Nothing to skip");
  await transition(phase, revealPatch(g));
  return { ok: true };
}

export async function addTime(phase: number, seconds = 60): Promise<Res> {
  await requireOrganizer();
  const g = await getGame();
  if (g.phase !== phase) return fail("Game moved on");
  if (g.paused_remaining_ms !== null)
    await transition(phase, { paused_remaining_ms: g.paused_remaining_ms + seconds * 1000 });
  else if (g.phase_ends_at)
    await transition(phase, { phase_ends_at: new Date(new Date(g.phase_ends_at).getTime() + seconds * 1000).toISOString() });
  return { ok: true };
}

export async function togglePause(phase: number): Promise<Res> {
  await requireOrganizer();
  const g = await getGame();
  if (g.phase !== phase) return fail("Game moved on");
  if (g.paused_remaining_ms !== null)
    await transition(phase, { phase_ends_at: new Date(Date.now() + g.paused_remaining_ms).toISOString(), paused_remaining_ms: null });
  else if (g.phase_ends_at)
    await transition(phase, {
      paused_remaining_ms: Math.max(0, new Date(g.phase_ends_at).getTime() - Date.now()),
      phase_ends_at: null,
    });
  return { ok: true };
}

export async function toggleExtra(phase: number): Promise<Res> {
  await requireOrganizer();
  const g = await getGame();
  await transition(phase, { show_extra: !g.show_extra });
  return { ok: true };
}

/** Wipes answers, votes and scores; keeps teams and participants. */
export async function resetEvent(): Promise<Res> {
  await requireOrganizer();
  const g = await getGame();
  await db.from("submissions").delete().neq("question_id", "");
  await db.from("votes").delete().neq("question_id", "");
  await transition(g.phase, {
    stage: "lobby",
    question_id: null,
    dialogue_index: 0,
    presenting_team_id: null,
    presented_team_ids: [],
    submitted_team_ids: [],
    voted_team_ids: [],
    finished_question_ids: [],
    show_extra: false,
    phase_ends_at: null,
    paused_remaining_ms: null,
  });
  return { ok: true };
}

/* ---------------- participants ---------------- */

export async function serverNow() {
  return Date.now();
}

export async function joinEvent(pid: string, name: string): Promise<Res> {
  if (!UUID.test(pid)) return fail("Bad id");
  const n = String(name).trim().slice(0, 24);
  if (!n) return fail("Enter your name");
  const { error } = await db.from("participants").upsert({ id: pid, name: n });
  return error ? fail(error.message) : { ok: true };
}

export async function setTeam(pid: string, teamId: string | null): Promise<Res> {
  const p = await getParticipant(pid);
  if (!p) return fail("Join first");
  const g = await getGame();
  // shortcut: team changes are frozen during presenting/voting (prevents voting twice by switching)
  if (p.team_id && (g.stage === "presenting" || g.stage === "voting"))
    return fail("Wait until the presentation is over to switch teams");
  if (teamId && !(await getTeams()).some((t) => t.id === teamId)) return fail("Team not found");
  const { error } = await db.from("participants").update({ team_id: teamId }).eq("id", pid);
  return error ? fail(error.message) : { ok: true };
}

export async function submitAnswer(
  pid: string,
  input: { choice?: number | null; number?: number | null; explanation?: string },
): Promise<Res> {
  const p = await getParticipant(pid);
  if (!p?.team_id) return fail("Join a team first");
  const g = await getGame();
  const q = questionById(g.question_id);
  if (g.stage !== "answering" || !q) return fail("Answering is closed");

  const explanation = String(input.explanation ?? "").trim().slice(0, 2000);
  const { data: existing } = await db
    .from("submissions")
    .select("*")
    .eq("question_id", q.id)
    .eq("team_id", p.team_id)
    .maybeSingle();

  let choice: number | null = null,
    number: number | null = null;
  if (q.kind === "number") {
    number = Number(input.number);
    if (!Number.isInteger(number) || number < 0 || number > 100) return fail("Pick a whole number from 0 to 100");
  } else {
    choice = Number(input.choice);
    if (!Number.isInteger(choice) || choice < 0 || choice >= q.choices.length) return fail("Pick an answer");
    if (q.lockChoice && existing?.locked) choice = existing.choice; // 1C: first pick is final
  }
  if (!q.lockChoice && !explanation) return fail("Add an explanation");

  const { error } = await db.from("submissions").upsert({
    question_id: q.id,
    team_id: p.team_id,
    choice,
    number,
    explanation,
    locked: !!q.lockChoice,
    updated_at: new Date().toISOString(),
  });
  if (error) return fail(error.message);

  if (explanation) {
    await db.rpc("mark_submitted", { t: p.team_id });
    const [g2, teams] = await Promise.all([getGame(), getTeams()]);
    if (g2.stage === "answering" && teams.every((t) => g2.submitted_team_ids.includes(t.id))) await advanceFrom(g2.phase);
  }
  return { ok: true };
}

export async function getMySubmission(pid: string) {
  const p = await getParticipant(pid);
  const g = await getGame();
  if (!p?.team_id || !g.question_id) return { submission: null, table: null };
  const { data } = await db
    .from("submissions")
    .select("choice, number, explanation, locked")
    .eq("question_id", g.question_id)
    .eq("team_id", p.team_id)
    .maybeSingle();
  const q = questionById(g.question_id);
  return {
    submission: data as Pick<Submission, "choice" | "number" | "explanation" | "locked"> | null,
    table: q?.lockChoice && data?.locked ? SURGEON_TABLE : null,
  };
}

export async function castVote(pid: string, score: number): Promise<Res> {
  const p = await getParticipant(pid);
  if (!p?.team_id) return fail("Join a team first");
  const g = await getGame();
  if (g.stage !== "voting" || !g.presenting_team_id || !g.question_id) return fail("Voting is closed");
  if (p.team_id === g.presenting_team_id) return fail("You can't vote for your own team");
  const s = Number(score);
  if (!Number.isInteger(s) || s < 0 || s > 10) return fail("Vote 0 to 10");
  const { error } = await db.from("votes").upsert({
    question_id: g.question_id,
    presenting_team_id: g.presenting_team_id,
    voter_team_id: p.team_id,
    score: s,
  });
  if (error) return fail(error.message);
  await db.rpc("mark_voted", { t: p.team_id });
  const [g2, teams] = await Promise.all([getGame(), getTeams()]);
  const voters = teams.filter((t) => t.id !== g2.presenting_team_id);
  if (g2.stage === "voting" && voters.every((t) => g2.voted_team_ids.includes(t.id))) await advanceFrom(g2.phase);
  return { ok: true };
}

/* ---------------- results (public: totals + averages only) ---------------- */

export type Standing = { id: string; name: string; color: string; total: number };
export type RevealRow = {
  teamId: string;
  choice: number | null;
  number: number | null;
  correct: boolean;
  voteAvg: number;
  votes: number;
  points: number;
};
export type Results = {
  standings: Standing[];
  reveal: null | {
    questionId: string;
    correct: number[];
    answer: string;
    insight: string;
    rows: RevealRow[];
    twoThirds?: { average: number | null; target: number | null; closest: string[] };
    pairs?: { a: string; b: string; aChoice: number; bChoice: number; aPts: number; bPts: number }[];
  };
  table: typeof SURGEON_TABLE | null;
};

const PAYOFF = [
  [3, 0],
  [5, 1],
]; // PAYOFF[mine][theirs], 0 = cooperate, 1 = defect

export async function getResults(): Promise<Results> {
  const [g, teams] = await Promise.all([getGame(), getTeams()]);
  const ids = teams.map((t) => t.id);
  const done = g.finished_question_ids;
  const [{ data: subs }, { data: votes }] = await Promise.all([
    db.from("submissions").select("*").in("question_id", done.length ? done : ["-"]),
    db.from("votes").select("*").in("question_id", done.length ? done : ["-"]),
  ]);
  const S = (subs ?? []) as Submission[],
    V = (votes ?? []) as Vote[];

  const scored: Record<string, ReturnType<typeof scoreQuestion>> = {};
  for (const qid of done) {
    scored[qid] = scoreQuestion(
      qid,
      ANSWERS[qid]?.correct ?? [],
      ids,
      S.filter((s) => s.question_id === qid),
      V.filter((v) => v.question_id === qid),
    );
  }
  const standings = teams
    .map((t) => ({ id: t.id, name: t.name, color: t.color, total: done.reduce((a, q) => a + (scored[q]?.[t.id]?.points ?? 0), 0) }))
    .sort((a, b) => b.total - a.total);

  let reveal: Results["reveal"] = null;
  const qid = g.question_id;
  if (g.stage === "reveal" && qid && scored[qid]) {
    const qs = S.filter((s) => s.question_id === qid);
    const rows = teams.map((t) => {
      const s = qs.find((x) => x.team_id === t.id);
      return { teamId: t.id, choice: s?.choice ?? null, number: s?.number ?? null, ...scored[qid][t.id] };
    });
    reveal = { questionId: qid, ...ANSWERS[qid], rows };
    if (qid === "2a") reveal.twoThirds = twoThirds(qs);
    if (qid === "2b") {
      // Fun only, no points: pair teams deterministically by id
      const players = qs.filter((s) => s.choice === 0 || s.choice === 1).sort((a, b) => a.team_id.localeCompare(b.team_id));
      reveal.pairs = [];
      for (let i = 0; i + 1 < players.length; i += 2) {
        const a = players[i],
          b = players[i + 1];
        reveal.pairs.push({
          a: a.team_id,
          b: b.team_id,
          aChoice: a.choice!,
          bChoice: b.choice!,
          aPts: PAYOFF[a.choice!][b.choice!],
          bPts: PAYOFF[b.choice!][a.choice!],
        });
      }
    }
  }
  const table = qid && questionById(qid)?.lockChoice && (g.show_extra || g.stage === "reveal") ? SURGEON_TABLE : null;
  return { standings, reveal, table };
}
