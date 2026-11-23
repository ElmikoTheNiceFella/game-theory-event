// Pure scoring logic: no imports, so `node --test` can run it directly.

export type ScoreSub = { team_id: string; choice: number | null; number: number | null };
export type ScoreVote = { presenting_team_id: string; voter_team_id: string; score: number };
export type TeamScore = { correct: boolean; voteAvg: number; votes: number; points: number };

export const CORRECT_POINTS = 2;

/** 2A: target = 2/3 of the average submitted number; winners = all teams tied closest. */
export function twoThirds(subs: ScoreSub[]) {
  const nums = subs.filter((s) => s.number !== null) as (ScoreSub & { number: number })[];
  if (!nums.length) return { average: null, target: null, closest: [] as string[] };
  const average = nums.reduce((a, s) => a + s.number, 0) / nums.length;
  const target = (2 / 3) * average;
  const best = Math.min(...nums.map((s) => Math.abs(s.number - target)));
  const closest = nums.filter((s) => Math.abs(Math.abs(s.number - target) - best) < 1e-9).map((s) => s.team_id);
  return { average, target, closest };
}

/** Per team: (correct ? 2 : 0) + mean of votes from OTHER teams (0 if none). */
export function scoreQuestion(
  questionId: string,
  correct: number[],
  teamIds: string[],
  subs: ScoreSub[],
  votes: ScoreVote[],
): Record<string, TeamScore> {
  const tt = questionId === "2a" ? twoThirds(subs) : null;
  const out: Record<string, TeamScore> = {};
  for (const t of teamIds) {
    const s = subs.find((x) => x.team_id === t);
    const isCorrect = !!s && (tt ? s.number === 0 || tt.closest.includes(t) : s.choice !== null && correct.includes(s.choice));
    const vs = votes.filter((v) => v.presenting_team_id === t && v.voter_team_id !== t);
    const voteAvg = vs.length ? vs.reduce((a, v) => a + v.score, 0) / vs.length : 0;
    out[t] = { correct: isCorrect, voteAvg, votes: vs.length, points: (isCorrect ? CORRECT_POINTS : 0) + voteAvg };
  }
  return out;
}

/** 2B: each team scores its raw match total (no win bonus, no votes). */
export function matchScores(teamIds: string[], matches: { a: string; b: string; a_score: number; b_score: number }[]): Record<string, TeamScore> {
  const out: Record<string, TeamScore> = {};
  for (const t of teamIds) {
    const m = matches.find((x) => x.a === t || x.b === t);
    out[t] = { correct: false, voteAvg: 0, votes: 0, points: m ? (m.a === t ? m.a_score : m.b_score) : 0 };
  }
  return out;
}

/** Random head-to-head pairs; null when the team count is odd or below 2. */
export function pairUp(teamIds: string[], rand = Math.random): [string, string][] | null {
  if (teamIds.length < 2 || teamIds.length % 2) return null;
  const s = [...teamIds];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return Array.from({ length: s.length / 2 }, (_, i) => [s[2 * i], s[2 * i + 1]]);
}
