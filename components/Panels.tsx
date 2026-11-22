"use client";

import { motion } from "motion/react";
import type { Results, Standing } from "@/app/actions";
import type { Question } from "@/lib/questions";
import type { Team } from "@/lib/types";

const pct = (ok: number, n: number) => `${((ok / n) * 100).toFixed(1)}%`;
const fmt = (x: number) => (Math.round(x * 100) / 100).toString();

export function TeamChip({ team, dim }: { team: Pick<Team, "name" | "color">; dim?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-bold" style={{ background: dim ? "rgba(255,255,255,.08)" : team.color, opacity: dim ? 0.6 : 1 }}>
      {team.name}
    </span>
  );
}

export function PayoffMatrix() {
  const cell = "border border-white/20 px-4 py-3 text-center";
  return (
    <table className="mx-auto border-collapse text-lg">
      <thead>
        <tr>
          <th className={cell}></th>
          <th className={cell}>Team B Cooperates</th>
          <th className={cell}>Team B Defects</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th className={cell}>Team A Cooperates</th>
          <td className={cell}>A: 3, B: 3</td>
          <td className={cell}>A: 0, B: 5</td>
        </tr>
        <tr>
          <th className={cell}>Team A Defects</th>
          <td className={cell}>A: 5, B: 0</td>
          <td className={cell}>A: 1, B: 1</td>
        </tr>
      </tbody>
    </table>
  );
}

export function SurgeonTableView({ table }: { table: NonNullable<Results["table"]> }) {
  const cell = "border border-white/20 px-4 py-2 text-center";
  return (
    <table className="mx-auto border-collapse text-lg">
      <thead>
        <tr>
          <th className={cell}>Surgeon</th>
          <th className={cell}>Mild cases</th>
          <th className={cell}>Severe cases</th>
          <th className={cell}>Overall</th>
        </tr>
      </thead>
      <tbody>
        {table.map((r) => (
          <tr key={r.surgeon}>
            <th className={cell}>{r.surgeon}</th>
            <td className={cell}>
              {r.mild.ok}/{r.mild.n} = <b>{pct(r.mild.ok, r.mild.n)}</b>
            </td>
            <td className={cell}>
              {r.severe.ok}/{r.severe.n} = <b>{pct(r.severe.ok, r.severe.n)}</b>
            </td>
            <td className={cell}>
              {pct(r.mild.ok + r.severe.ok, r.mild.n + r.severe.n)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Problem summary shown after the dialogue (host big screen + phones). */
export function QuestionSummary({ q, big }: { q: Question; big?: boolean }) {
  return (
    <div className={big ? "space-y-5" : "space-y-3"}>
      <div className="text-sm font-bold tracking-widest text-violet-300 uppercase">
        {q.code} · {q.topic}
      </div>
      <h2 className={`font-black ${big ? "text-5xl" : "text-2xl"}`}>{q.title}</h2>
      <ul className={`list-disc space-y-1 pl-6 ${big ? "text-2xl" : "text-base"} text-white/85`}>
        {q.summary.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      {q.extra === "matrix" && <PayoffMatrix />}
      <p className={`font-bold text-amber-300 ${big ? "text-3xl" : "text-lg"}`}>{q.prompt}</p>
      {big && q.kind === "mcq" && (
        <div className="grid grid-cols-2 gap-3">
          {q.choices.map((c, i) => (
            <div key={c} className="rounded-2xl bg-white/10 px-5 py-3 text-xl">
              <b className="mr-2 text-violet-300">{String.fromCharCode(65 + i)}.</b>
              {c}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Leaderboard({ standings, highlight, title = "Leaderboard" }: { standings: Standing[]; highlight?: string | null; title?: string }) {
  const max = Math.max(1, ...standings.map((s) => s.total));
  return (
    <div className="mx-auto w-full max-w-4xl space-y-3">
      <h2 className="mb-6 text-center text-5xl font-black">{title}</h2>
      {standings.map((s, i) => (
        <motion.div
          layout
          key={s.id}
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className={`flex items-center gap-4 rounded-2xl bg-white/5 p-3 ${highlight === s.id ? "ring-4 ring-amber-300" : ""}`}
        >
          <span className="w-10 text-center text-3xl font-black text-white/70">{i + 1}</span>
          <div className="relative h-12 flex-1 overflow-hidden rounded-xl bg-white/5">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-xl"
              style={{ background: s.color }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(4, (s.total / max) * 100)}%` }}
              transition={{ duration: 0.9, delay: 0.2 + i * 0.08 }}
            />
            <span className="relative z-10 flex h-full items-center px-4 text-xl font-bold">{s.name}</span>
          </div>
          <span className="w-24 text-right text-3xl font-black tabular-nums">{fmt(s.total)}</span>
        </motion.div>
      ))}
    </div>
  );
}

/** Answer reveal: correct answer, insight, per-team results (averages only). */
export function Reveal({ q, results, teams }: { q: Question; results: Results; teams: Team[] }) {
  const r = results.reveal;
  if (!r) return <p className="text-center text-2xl text-white/60">Loading results…</p>;
  const team = (id: string) => teams.find((t) => t.id === id);
  const show = (row: (typeof r.rows)[number]) =>
    q.kind === "number" ? (row.number ?? "—") : row.choice !== null ? `${String.fromCharCode(65 + row.choice)}. ${q.choices[row.choice]}` : "—";
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="text-sm font-bold tracking-widest text-violet-300 uppercase">
        {q.code} · {q.title}
      </div>
      <motion.h2 initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl font-black text-emerald-300">
        ✓ {r.answer}
      </motion.h2>
      <p className="text-2xl leading-relaxed text-white/85">{r.insight}</p>
      {results.table && <SurgeonTableView table={results.table} />}
      {r.twoThirds && r.twoThirds.target !== null && (
        <p className="text-2xl">
          Average: <b>{fmt(r.twoThirds.average!)}</b> → target ⅔ × avg = <b className="text-amber-300">{fmt(r.twoThirds.target)}</b> · Closest:{" "}
          {r.twoThirds.closest.map((id) => team(id)?.name).join(", ")}
        </p>
      )}
      {r.pairs && r.pairs.length > 0 && (
        <div className="space-y-1 text-xl">
          <div className="text-white/60">Just for fun, if teams were paired up:</div>
          {r.pairs.map((p) => (
            <div key={p.a}>
              {team(p.a)?.name} ({p.aChoice ? "Defect" : "Cooperate"}) vs {team(p.b)?.name} ({p.bChoice ? "Defect" : "Cooperate"}) →{" "}
              <b>
                {p.aPts} : {p.bPts}
              </b>
            </div>
          ))}
        </div>
      )}
      <table className="w-full border-collapse text-xl">
        <thead className="text-left text-white/60">
          <tr>
            <th className="py-2">Team</th>
            <th>Answer</th>
            <th className="text-center">Correct</th>
            <th className="text-center">Avg vote</th>
            <th className="text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {r.rows.map((row) => (
            <tr key={row.teamId} className="border-t border-white/10">
              <td className="py-2">{team(row.teamId) && <TeamChip team={team(row.teamId)!} />}</td>
              <td>{show(row)}</td>
              <td className="text-center">{row.correct ? "✅ +2" : "❌"}</td>
              <td className="text-center">{row.votes ? fmt(row.voteAvg) : "—"}</td>
              <td className="text-right font-black">{fmt(row.points)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
