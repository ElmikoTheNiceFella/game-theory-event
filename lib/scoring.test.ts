import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreQuestion, twoThirds } from "./scoring.ts";
import { SURGEON_TABLE } from "./surgeonTable.ts";

const sub = (team_id: string, choice: number | null, number: number | null = null) => ({ team_id, choice, number });

test("mcq: +2 for correct plus mean of other teams' votes, self-votes ignored", () => {
  const r = scoreQuestion("1a", [1], ["A", "B", "C"], [sub("A", 1), sub("B", 0)], [
    { presenting_team_id: "A", voter_team_id: "B", score: 6 },
    { presenting_team_id: "A", voter_team_id: "C", score: 9 },
    { presenting_team_id: "A", voter_team_id: "A", score: 10 },
  ]);
  assert.deepEqual(r.A, { correct: true, voteAvg: 7.5, votes: 2, points: 9.5 });
  assert.deepEqual(r.B, { correct: false, voteAvg: 0, votes: 0, points: 0 });
  assert.equal(r.C.points, 0); // no submission, no votes
});

test("non-submitter still earns vote average", () => {
  const r = scoreQuestion("1a", [1], ["A", "B"], [], [{ presenting_team_id: "A", voter_team_id: "B", score: 4 }]);
  assert.deepEqual(r.A, { correct: false, voteAvg: 4, votes: 1, points: 4 });
});

test("2A: 0 always scores, closest scores, ties all score", () => {
  // numbers 0, 30, 30, 60 -> avg 30, target 20 -> 30 (diff 10) vs 0 (diff 20): closest = B,C
  const subs = [sub("A", null, 0), sub("B", null, 30), sub("C", null, 30), sub("D", null, 60)];
  const tt = twoThirds(subs);
  assert.equal(tt.target, 20);
  assert.deepEqual(tt.closest, ["B", "C"]);
  const r = scoreQuestion("2a", [0], ["A", "B", "C", "D"], subs, []);
  assert.deepEqual([r.A.correct, r.B.correct, r.C.correct, r.D.correct], [true, true, true, false]);
});

test("2A: no submissions is safe", () => {
  assert.deepEqual(twoThirds([]), { average: null, target: null, closest: [] });
});

test("1C table: A 95% vs B 90% overall, but B better in both categories", () => {
  const [a, b] = SURGEON_TABLE;
  const overall = (s: typeof a) => (s.mild.ok + s.severe.ok) / (s.mild.n + s.severe.n);
  assert.equal(overall(a), 0.95);
  assert.equal(overall(b), 0.9);
  assert.ok(b.mild.ok / b.mild.n > a.mild.ok / a.mild.n);
  assert.ok(b.severe.ok / b.severe.n > a.severe.ok / a.severe.n);
});
