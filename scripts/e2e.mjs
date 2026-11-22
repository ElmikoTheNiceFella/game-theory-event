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
for (const n of ["Alpha", "Bravo", "Charlie"]) ok(await call("addTeam", [n]), "add team " + n);
const teams = (await admin.from("teams").select("*").order("created_at")).data;
const [A, B, C] = teams.map((t) => t.id);
const P = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
for (let i = 0; i < 3; i++) { ok(await call("joinEvent", [P[i], "Player" + i]), "join " + i); ok(await call("setTeam", [P[i], teams[i].id]), "team " + i); }

let g = await G();
ok(await call("goTo", [g.phase, "rules"]), "→ rules");
g = await G(); ok(await call("goTo", [g.phase, "select"]), "→ select");
g = await G(); ok(await call("startQuestion", [g.phase, "2a"]), "start 2A");
// stale phase must be ignored (double-click safety)
const stale = g.phase;
g = await G(); assert.equal(g.stage, "dialogue");
ok(await call("dialogueStep", [g.phase, 1]), "dialogue next");
const r = await call("dialogueStep", [stale, 1]); assert.ok(r.error, "stale phase rejected"); console.log("✓ stale phase rejected");
while ((g = await G()).stage === "dialogue") await call("dialogueStep", [g.phase, 1]);
assert.equal(g.stage, "answering"); console.log("✓ dialogue → answering");
assert.ok((await call("submitAnswer", [P[0], { number: 0, explanation: "" }])).error, "explanation required"); console.log("✓ explanation required");
assert.ok((await call("submitAnswer", [P[0], { number: 101, explanation: "x" }])).error); console.log("✓ out-of-range number rejected");
ok(await call("submitAnswer", [P[0], { number: 0, explanation: "nash" }]), "A submits 0");
ok(await call("submitAnswer", [P[1], { number: 30, explanation: "level 1" }]), "B submits 30");
ok(await call("submitAnswer", [P[2], { number: 60, explanation: "yolo" }]), "C submits 60");
g = await G(); assert.equal(g.stage, "presenting", "auto-close after all submitted"); console.log("✓ auto-advanced to presenting");

// phones can't read private tables even when they have rows
assert.deepEqual((await anon.from("submissions").select("*")).data, []);
assert.ok((await admin.from("submissions").select("*")).data.length === 3);
console.log("✓ RLS hides submissions from phones (3 rows exist)");

const order = [];
while ((g = await G()).stage !== "reveal") {
  if (g.stage === "presenting") {
    order.push(g.presenting_team_id);
    const own = P[teams.findIndex((t) => t.id === g.presenting_team_id)];
    assert.ok((await call("setTeam", [P[0], B])).error, "no switching during presentation");
    ok(await call("advance", [g.phase]), "presenting → voting");
    assert.ok((await call("castVote", [own, 10])).error, "self vote blocked");
  } else if (g.stage === "voting") {
    for (const p of P) if (p !== P[teams.findIndex((t) => t.id === g.presenting_team_id)]) await call("castVote", [p, 5]);
  } else throw new Error("unexpected stage " + g.stage);
}
assert.equal(new Set(order).size, 3); console.log("✓ every team presented once, then reveal; self-votes & switching blocked");
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

g = await G(); ok(await call("goTo", [g.phase, "finale"]), "→ finale");
g = await G(); ok(await call("goTo", [g.phase, "final"]), "→ final");

// leave clean
ok(await call("resetEvent"), "reset");
for (const t of teams) await call("removeTeam", [t.id]);
await admin.from("participants").delete().in("id", P);
console.log("\nALL E2E CHECKS PASSED");
