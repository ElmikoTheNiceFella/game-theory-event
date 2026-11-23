// E2E: drives the real server actions over HTTP against a running build.
// DESTRUCTIVE: resets the event and deletes ALL teams in the Supabase project. Never run on event day.
// Usage: npm run build && npx next start -p 3123 &  then  E2E_CONFIRM=1 npm run e2e
if (process.env.E2E_CONFIRM !== "1") {
  console.error("Refusing to run: this wipes the event data. Set E2E_CONFIRM=1 to proceed.");
  process.exit(1);
}
import fs from "node:fs";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const BASE = process.env.E2E_BASE ?? "http://localhost:3123";
const man = JSON.parse(fs.readFileSync(".next/server/server-reference-manifest.json", "utf8")).node;
const ID = Object.fromEntries(Object.entries(man).map(([id, v]) => [v.exportedName, id]));
let cookie = "";
async function call(name, args = [], opts = {}) {
  const res = await fetch(BASE + "/host", {
    method: "POST",
    headers: { "Next-Action": ID[name], "Content-Type": "text/plain;charset=UTF-8", Accept: "text/x-component", ...(opts.noCookie ? {} : { Cookie: cookie }) },
    body: JSON.stringify(args),
  });
  const sc = res.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  const text = await res.text();
  const line = text.split("\n").find((l) => l.startsWith("1:"));
  if (!line) return { raw: text.slice(0, 200), status: res.status };
  if (line.startsWith("1:E")) return { error: "thrown", thrown: true };
  return JSON.parse(line.slice(2));
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET);
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const G = async () => (await admin.from("game").select("*").eq("id", 1).single()).data;
const ok = (r, label) => { if (r?.error || r?.raw) throw new Error(label + ": " + JSON.stringify(r)); console.log("✓", label); };

// auth
const denied = await call("advance", [0], { noCookie: true });
assert.ok(denied.thrown, "advance without cookie must fail");
console.log("✓ organizer action rejected without PIN cookie");
assert.equal((await call("organizerLogin", ["wrong-pin"])).error, "Wrong PIN"); console.log("✓ wrong PIN rejected");
ok(await call("organizerLogin", [process.env.ORGANIZER_PIN]), "login");

// fresh state
ok(await call("resetEvent"), "reset");
for (const t of (await admin.from("teams").select("id")).data) await call("removeTeam", [t.id]);
for (const n of ["Alpha", "Bravo", "Charlie", "Delta (empty)"]) ok(await call("addTeam", [n]), "add team " + n);
const teams = (await admin.from("teams").select("*").order("created_at")).data;
const [A, B, C, D] = teams.map((t) => t.id);
const P = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
for (let i = 0; i < 3; i++) { ok(await call("joinEvent", [P[i], "Player" + i]), "join " + i); ok(await call("setTeam", [P[i], teams[i].id]), "team " + i); }

// public participant ids (readable by any phone) must not work as credentials
const publicIds = (await anon.from("participants").select("id")).data.map((x) => x.id);
assert.equal(publicIds.length, 3);
assert.ok(!publicIds.some((id) => P.includes(id)), "secrets never stored as ids");
assert.ok((await call("setTeam", [publicIds[0], B])).error, "public id rejected");
console.log("✓ public participant ids can't be used to act as someone else");

let g = await G();
ok(await call("goTo", [g.phase, "rules"]), "→ rules");
g = await G(); ok(await call("goTo", [g.phase, "select"]), "→ select");
g = await G(); ok(await call("startQuestion", [g.phase, "2a"]), "start 2A");
// stale phase must be ignored (double-click safety)
const stale = g.phase;
g = await G(); assert.equal(g.stage, "dialogue");
ok(await call("dialogueStep", [g.phase, 1]), "dialogue next");
const r = await call("dialogueStep", [stale, 1]); assert.equal(r.error, "stale"); console.log("✓ stale phase rejected");
while ((g = await G()).stage === "dialogue") await call("dialogueStep", [g.phase, 1]);
assert.equal(g.stage, "answering"); console.log("✓ dialogue → answering");
assert.ok((await call("submitAnswer", [P[0], { number: 0, explanation: "" }])).error, "explanation required"); console.log("✓ explanation required");
assert.ok((await call("submitAnswer", [P[0], { number: 101, explanation: "x" }])).error); console.log("✓ out-of-range number rejected");
ok(await call("submitAnswer", [P[0], { number: 0, explanation: "nash" }]), "A submits 0");
ok(await call("submitAnswer", [P[1], { number: 30, explanation: "level 1" }]), "B submits 30");
ok(await call("submitAnswer", [P[2], { number: 60, explanation: "yolo" }]), "C submits 60");
g = await G(); assert.equal(g.stage, "presenting", "auto-close after all submitted"); console.log("✓ auto-advanced to presenting (empty team not waited for)");

// phones can't read private tables even when they have rows
assert.deepEqual((await anon.from("submissions").select("*")).data, []);
assert.ok((await admin.from("submissions").select("*")).data.length === 3);
console.log("✓ RLS hides submissions from phones (3 rows exist)");

const order = [];
while ((g = await G()).stage !== "reveal") {
  if (g.stage === "presenting") {
    if (!order.length) {
      assert.ok((await call("getPresentation", [], { noCookie: true })).thrown, "presentation is organizer-only");
      const pres = await call("getPresentation");
      assert.equal(pres.picks.length, 3);
      assert.ok(pres.explanation.length > 0, "presenter explanation shown");
      console.log("✓ presentation: every pick + presenter's explanation, organizer-only");
    }
    order.push(g.presenting_team_id);
    const own = P[teams.findIndex((t) => t.id === g.presenting_team_id)];
    assert.ok((await call("setTeam", [P[0], B])).error, "no switching during presentation");
    ok(await call("advance", [g.phase]), "presenting → voting");
    assert.ok((await call("castVote", [own, 10])).error, "self vote blocked");
  } else if (g.stage === "voting") {
    for (const p of P) if (p !== P[teams.findIndex((t) => t.id === g.presenting_team_id)]) await call("castVote", [p, 5]);
    // a phone trying to vote using someone else's public id is rejected
    assert.ok((await call("castVote", [publicIds[0], 0])).error);
  } else throw new Error("unexpected stage " + g.stage);
}
assert.equal(new Set(order).size, 3); assert.ok(!order.includes(D), "empty team never presents");
console.log("✓ every non-empty team presented once, then reveal; self-votes & switching blocked");
assert.deepEqual((await anon.from("votes").select("*")).data, []); console.log("✓ RLS hides votes from phones");

const res = await call("getResults");
const pts = Object.fromEntries(res.reveal.rows.map((x) => [x.teamId, x.points]));
assert.deepEqual([pts[A], pts[B], pts[C]], [7, 7, 5]);
assert.equal(res.reveal.twoThirds.target, 20);
console.log("✓ 2A scoring: 0 → +2, closest(30) → +2, avg vote 5 each:", [pts[A], pts[B], pts[C]]);

// 1C lock flow
g = await G(); ok(await call("goTo", [g.phase, "leaderboard"]), "→ leaderboard");
g = await G(); ok(await call("goTo", [g.phase, "select"]), "→ select");
g = await G(); ok(await call("startQuestion", [g.phase, "1c"]), "start 1C");
while ((g = await G()).stage === "dialogue") await call("dialogueStep", [g.phase, 1]);
assert.equal((await call("getMySubmission", [P[0]])).table, null); console.log("✓ 1C table hidden before locking");
ok(await call("submitAnswer", [P[0], { choice: 1, explanation: "" }]), "A locks B");
ok(await call("submitAnswer", [P[0], { choice: 0, explanation: "simpson" }]), "A explains (tries to change)");
const mine = await call("getMySubmission", [P[0]]);
assert.equal(mine.submission.choice, 1); assert.ok(mine.table); console.log("✓ 1C pick locked, table shown after lock");
g = await G(); assert.deepEqual(g.submitted_team_ids, [A]);
ok(await call("togglePause", [g.phase]), "pause");
g = await G(); assert.ok(g.paused_remaining_ms > 0 && g.phase_ends_at === null);
ok(await call("addTime", [g.phase, 60]), "+1 min while paused");
const before = g.paused_remaining_ms; g = await G(); assert.equal(g.paused_remaining_ms, before + 60000);
ok(await call("togglePause", [g.phase]), "resume"); console.log("✓ pause / +1 min / resume");
g = await G(); ok(await call("skipToReveal", [g.phase]), "skip to reveal");
const r2 = await call("getResults");
assert.equal(r2.reveal.rows.find((x) => x.teamId === A).correct, true);
assert.equal(r2.standings[0].id, A); console.log("✓ standings:", r2.standings.map((s) => `${s.name}=${s.total}`).join(" "));

// 2B head-to-head matches
g = await G(); ok(await call("goTo", [g.phase, "leaderboard"]), "→ leaderboard");
g = await G(); ok(await call("goTo", [g.phase, "select"]), "→ select");
g = await G(); assert.match((await call("startQuestion", [g.phase, "2b"])).error, /even number/); console.log("✓ 2B refuses an odd number of active teams");
P.push(crypto.randomUUID());
ok(await call("joinEvent", [P[3], "Player3"]), "join 3"); ok(await call("setTeam", [P[3], D]), "team D");
g = await G(); ok(await call("startQuestion", [g.phase, "2b"]), "start 2B (4 teams)");
while ((g = await G()).stage === "dialogue") await call("dialogueStep", [g.phase, 1]);
assert.equal(g.stage, "matches"); console.log("✓ dialogue → matches");
let ms = (await anon.from("matches").select("*").order("id")).data;
assert.equal(ms.length, 2); assert.deepEqual(ms.flatMap((m) => [m.a, m.b]).sort(), [A, B, C, D].sort());
console.log("✓ 4 teams paired into 2 matches, readable by phones");
const pOf = (team) => P[teams.findIndex((t) => t.id === team)];
const [m0, m1] = ms;
assert.ok((await call("setTeam", [pOf(m0.a), m0.b])).error, "no switching during matches");
ok(await call("playMove", [pOf(m0.a), 1, 0]), "m0.a cooperates");
assert.deepEqual((await anon.from("match_moves").select("*")).data, []);
assert.ok((await admin.from("match_moves").select("*")).data.length === 1);
let m = (await anon.from("matches").select("*").eq("id", m0.id).single()).data;
assert.equal(m.a_ready, true); assert.deepEqual(m.a_moves, []); console.log("✓ pending move hidden from phones, only 'ready' is public");
assert.ok((await call("playMove", [pOf(m0.b), 2, 1])).error, "wrong round rejected"); console.log("✓ stale round rejected");
ok(await call("playMove", [pOf(m0.b), 1, 1]), "m0.b defects");
m = (await anon.from("matches").select("*").eq("id", m0.id).single()).data;
assert.deepEqual([m.round, m.a_score, m.b_score, m.a_moves, m.b_moves, m.a_ready, m.b_ready], [2, 0, 5, [0], [1], false, false]);
console.log("✓ round resolved: C vs D → 0 : 5");
// both teams of match 1 press at the same moment: resolves exactly once
await Promise.all([call("playMove", [pOf(m1.a), 1, 0]), call("playMove", [pOf(m1.b), 1, 0])]);
m = (await anon.from("matches").select("*").eq("id", m1.id).single()).data;
assert.deepEqual([m.round, m.a_score, m.b_score], [2, 3, 3]); console.log("✓ simultaneous moves resolve once: 3 : 3");
for (let r = 2; r <= 4; r++) for (const x of [m0, m1]) { ok(await call("playMove", [pOf(x.a), r, 0]), `r${r} a`); await call("playMove", [pOf(x.b), r, x === m0 ? 1 : 0]); }
g = await G(); assert.equal(g.stage, "reveal", "auto-reveal when all matches finish"); console.log("✓ all matches finished → reveal");
assert.ok((await call("playMove", [pOf(m0.a), 5, 0])).error, "no moves after close");
const r3 = await call("getResults");
assert.equal(r3.reveal.matches.length, 2); assert.equal(r3.reveal.math.length > 0, true);
const p3 = Object.fromEntries(r3.reveal.rows.map((x) => [x.teamId, x.points]));
assert.deepEqual([p3[m0.a], p3[m0.b], p3[m1.a], p3[m1.b]], [0, 20, 12, 12]);
console.log("✓ 2B points = raw match totals:", [p3[m0.a], p3[m0.b], p3[m1.a], p3[m1.b]]);

// kick
assert.ok((await call("kickParticipant", [publicIds[0]], { noCookie: true })).thrown, "kick is organizer-only");
const kickId = (await anon.from("participants").select("id, name").eq("name", "Player3").single()).data.id;
ok(await call("kickParticipant", [kickId]), "kick Player3");
assert.equal((await anon.from("participants").select("id").eq("id", kickId)).data.length, 0);
assert.ok((await call("setTeam", [P[3], D])).error, "kicked phone must rejoin first"); console.log("✓ kicked player removed and must rejoin");

g = await G(); ok(await call("goTo", [g.phase, "finale"]), "→ finale");
g = await G(); ok(await call("goTo", [g.phase, "final"]), "→ final");

// leave clean
ok(await call("resetEvent"), "reset");
assert.equal((await admin.from("matches").select("id")).data.length, 0, "reset clears matches");
for (const t of teams) await call("removeTeam", [t.id]);
await admin.from("participants").delete().in("id", publicIds);
console.log("\nALL E2E CHECKS PASSED");
