"use client";

import type { Results, Standing } from "@/app/actions";
import type { Question } from "@/lib/questions";
import { PD_ROUNDS, type Match, type Team } from "@/lib/types";
import { C, LETTERS, fmt1, tokenFor } from "@/lib/theme";
import { Confetti, I, Token, Trophy, confettiPieces } from "./ui";

const pct = (ok: number, n: number) => `${((ok / n) * 100).toFixed(1)}%`;
type Table = NonNullable<Results["table"]>;

/* ---------------- 2B payoff matrix ---------------- */

export function PayoffMatrix({ phone = false }: { phone?: boolean }) {
  const cells = [
    ["You cooperate", [3, 3], [0, 5]],
    ["You defect", [5, 0], [1, 1]],
  ] as const;
  const head = phone ? 11 : 15;
  const num = phone ? 24 : 36;
  return (
    <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      <table className="mono" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, background: C.paper2, border: `2.5px solid ${C.ink}`, borderRadius: phone ? 14 : 16, overflow: "hidden", boxShadow: `${phone ? 3 : 5}px ${phone ? 3 : 5}px 0 ${C.ink}` }}>
        <thead>
          <tr>
            <th style={{ width: phone ? 90 : 150, background: C.ink }} />
            {["They cooperate", "They defect"].map((h) => (
              <th key={h} scope="col" style={{ padding: phone ? "8px 6px" : "10px 12px", background: C.ink, color: C.paper, fontSize: head, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", borderLeft: "2.5px solid #3A3842" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cells.map(([label, a, b]) => (
            <tr key={label}>
              <th scope="row" style={{ padding: phone ? "0 8px" : "0 14px", textAlign: "left", fontSize: head, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", borderTop: `2.5px solid ${C.ink}` }}>
                {label}
              </th>
              {[a, b].map((p, k) => (
                <td key={k} style={{ height: phone ? 52 : 70, textAlign: "center", fontSize: num, fontWeight: 800, borderTop: `2.5px solid ${C.ink}`, borderLeft: `2.5px solid ${C.ink}` }}>
                  <span style={{ color: C.vermDark }}>{p[0]}</span>
                  <span style={{ color: C.faint }}> / </span>
                  <span style={{ color: C.cobalt }}>{p[1]}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="label" style={{ display: "flex", gap: 22, fontSize: phone ? 11 : 15, letterSpacing: "0.06em" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, color: C.vermDark }}>
          <span style={{ width: 12, height: 12, background: C.vermDark }} />
          Your points
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, color: C.cobalt }}>
          <span style={{ width: 12, height: 12, background: C.cobalt }} />
          Their points
        </span>
      </figcaption>
    </figure>
  );
}

/* ---------------- 2B head-to-head matches ---------------- */

/** PAYOFF[mine][theirs], 0 = cooperate, 1 = defect (mirrors pd_move in schema.sql). */
export const PAYOFF = [
  [3, 0],
  [5, 1],
];

export const MOVE = [
  { label: "Cooperate", short: "C", color: "#34C77B" },
  { label: "Defect", short: "D", color: C.verm },
] as const;

/** One team's side of a match, from that team's point of view. */
export function matchSide(m: Match, teamId: string) {
  const isA = m.a === teamId;
  return {
    opp: isA ? m.b : m.a,
    mine: isA ? m.a_moves : m.b_moves,
    theirs: isA ? m.b_moves : m.a_moves,
    score: isA ? m.a_score : m.b_score,
    oppScore: isA ? m.b_score : m.a_score,
    ready: isA ? m.a_ready : m.b_ready,
    oppReady: isA ? m.b_ready : m.a_ready,
  };
}

/** Round cells: played = C/D, current = ready check or waiting dots, future = dashed. */
export function MoveCells({ moves, round, ready, size = 34, live = true }: { moves: number[]; round: number; ready: boolean; size?: number; live?: boolean }) {
  return (
    <span style={{ display: "flex", gap: Math.round(size * 0.18) }}>
      {Array.from({ length: PD_ROUNDS }, (_, k) => {
        const mv = moves[k];
        const current = live && k === round - 1;
        return (
          <span
            key={k}
            className={`mono ${mv !== undefined ? "gte-pop" : ""}`}
            aria-label={mv !== undefined ? `Round ${k + 1}: ${MOVE[mv].label}` : current ? (ready ? "chosen" : "choosing") : undefined}
            style={{ width: size, height: size, flex: "none", boxSizing: "border-box", display: "grid", placeItems: "center", borderRadius: Math.round(size * 0.26), border: mv !== undefined || (current && ready) ? `2px solid ${C.ink}` : `2px dashed ${current ? C.ink : C.faint}`, background: mv !== undefined ? MOVE[mv].color : current && ready ? C.paper : "transparent", fontSize: Math.round(size * 0.5), fontWeight: 800, color: C.ink }}
          >
            {mv !== undefined ? MOVE[mv].short : current ? ready ? <I.check size={Math.round(size * 0.5)} /> : <span className="gte-d1">•</span> : null}
          </span>
        );
      })}
    </span>
  );
}

/** Projector match card (live dashboard and reveal). */
export function MatchCard({ m, teams, compact = false }: { m: Match; teams: Team[]; compact?: boolean }) {
  const over = m.round > PD_ROUNDS;
  const lead = m.a_score === m.b_score ? null : m.a_score > m.b_score ? m.a : m.b;
  const cell = compact ? 28 : 34;
  return (
    <article className="gte-pop" style={{ boxSizing: "border-box", padding: compact ? "10px 14px" : "14px 18px", display: "flex", flexDirection: "column", gap: compact ? 6 : 10, background: C.paper2, border: `2.5px solid ${C.ink}`, borderRadius: 18, boxShadow: `4px 4px 0 ${C.ink}` }}>
      <span className="label" style={{ display: "flex", justifyContent: "space-between", fontSize: compact ? 12 : 14, letterSpacing: "0.1em", color: over ? C.ink : C.muted }}>
        <span>{over ? "Final" : `Round ${m.round} of ${PD_ROUNDS}`}</span>
        {over && <span>{lead ? "" : "Tie"}</span>}
      </span>
      {[m.a, m.b].map((id) => {
        const t = teams.find((x) => x.id === id);
        const side = matchSide(m, id);
        const wins = over && lead === id;
        return (
          <div key={id} style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <Token team={t} index={teams.findIndex((x) => x.id === id)} size={compact ? 30 : 38} radius={10} />
            <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: compact ? 18 : 21, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t?.name ?? "Removed team"}</span>
              {wins && (
                <span className="label gte-stamp" style={{ flex: "none", padding: "2px 8px", borderRadius: 999, background: C.ink, color: C.mari, fontSize: 11, letterSpacing: "0.1em" }}>
                  Wins
                </span>
              )}
            </span>
            <MoveCells moves={side.mine} round={m.round} ready={side.ready} size={cell} />
            <span key={side.score} className="mono gte-press" style={{ width: compact ? 44 : 56, textAlign: "right", fontSize: compact ? 26 : 34, fontWeight: 800, letterSpacing: "-0.04em" }}>
              {side.score}
            </span>
          </div>
        );
      })}
    </article>
  );
}

/** Revealable step-by-step math (host click). */
export function MathCard({ steps, phone = false }: { steps: string[]; phone?: boolean }) {
  return (
    <section className="gte-twist" style={{ display: "flex", flexDirection: "column", gap: phone ? 8 : 12, padding: phone ? "16px 16px" : "22px 26px", background: C.ink, color: C.paper, borderRadius: phone ? 18 : 22, boxShadow: `${phone ? 4 : 6}px ${phone ? 4 : 6}px 0 ${C.verm}` }}>
      <span className="serif" style={{ fontSize: phone ? 30 : 40, lineHeight: 1, color: C.mari }}>
        The math
      </span>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: phone ? 6 : 10 }}>
        {steps.map((st, i) => (
          <li key={st} className="gte-rowin" style={{ display: "flex", gap: phone ? 10 : 14, alignItems: "baseline", animationDelay: `${0.12 * i}s` }}>
            <span className="mono" style={{ flex: "none", width: phone ? 22 : 30, color: "#BFB8AA", fontSize: phone ? 14 : 18, fontWeight: 800 }}>
              {i + 1}.
            </span>
            <span className="mono" style={{ fontSize: phone ? 15 : 23, lineHeight: 1.35, fontWeight: 700 }}>
              {st}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------------- 1C surgeon breakdown ---------------- */

/** Projector version: paper card. */
export function SurgeonTable({ table }: { table: Table }) {
  const cell = { padding: "10px 14px", textAlign: "right" as const, borderTop: `2px solid ${C.line}` };
  return (
    <table className="mono gte-pop" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, background: C.paper2, border: `2.5px solid ${C.ink}`, borderRadius: 16, overflow: "hidden", boxShadow: `5px 5px 0 ${C.ink}` }}>
      <thead>
        <tr style={{ background: C.ink, color: C.paper, fontSize: 14, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {["Surgeon", "Mild", "Severe", "Overall"].map((h, i) => (
            <th key={h} scope="col" style={{ padding: "10px 14px", textAlign: i ? "right" : "left" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.map((r) => (
          <tr key={r.surgeon}>
            <th scope="row" style={{ ...cell, textAlign: "left", fontSize: 30, fontWeight: 800 }}>
              {r.surgeon}
            </th>
            {[r.mild, r.severe, { ok: r.mild.ok + r.severe.ok, n: r.mild.n + r.severe.n }].map((x, k) => (
              <td key={k} style={cell}>
                <span style={{ display: "block", fontSize: 26, fontWeight: 800 }}>{pct(x.ok, x.n)}</span>
                <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.muted }}>
                  {x.ok}/{x.n}
                </span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Phone version: the dark "plot twist" card. */
export function PlotTwist({ table }: { table: Table }) {
  return (
    <section className="gte-twist" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 16px 16px", background: C.ink, color: C.paper, borderRadius: 20, boxShadow: `5px 5px 0 ${C.verm}` }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="serif" style={{ fontSize: 40, lineHeight: 1, color: C.mari }}>
          Plot twist!
        </span>
        <span style={{ fontSize: 16, lineHeight: 1.35, color: "#DCD5C8" }}>The same records, split by how serious the case was.</span>
      </div>
      <table className="mono" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#BFB8AA" }}>
            {["Surgeon", "Mild", "Severe", "Overall"].map((h, i) => (
              <th key={h} scope="col" style={{ padding: "6px 4px", textAlign: i ? "right" : "left" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.map((r) => (
            <tr key={r.surgeon} style={{ borderTop: "1.5px solid #3A3842" }}>
              <th scope="row" style={{ padding: "12px 4px", textAlign: "left", fontSize: 24, fontWeight: 800 }}>
                {r.surgeon}
              </th>
              {[r.mild, r.severe, { ok: r.mild.ok + r.severe.ok, n: r.mild.n + r.severe.n }].map((x, k) => (
                <td key={k} style={{ padding: "12px 4px", textAlign: "right", verticalAlign: "top" }}>
                  <span style={{ display: "block", fontSize: 19, fontWeight: 800 }}>{k === 2 ? `${Math.round((x.ok / x.n) * 100)}%` : pct(x.ok, x.n)}</span>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#BFB8AA" }}>
                    {x.ok}/{x.n}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <span style={{ fontSize: 15, lineHeight: 1.4, color: "#DCD5C8" }}>How can A have the higher overall rate if B is better in both? Explain what it means for your pick.</span>
    </section>
  );
}

/* ---------------- leaderboards ---------------- */

const PIECES_LB = confettiPieces(56, 11);

export function HostLeaderboard({ standings, final, played }: { standings: Standing[]; final: boolean; played: string[] }) {
  const max = Math.max(1, ...standings.map((s) => s.total));
  const rowH = standings.length > 7 ? 56 : 76;
  return (
    <>
      <div style={{ position: "absolute", left: 56, right: 56, top: 104, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {final && <Trophy size={92} />}
          <h1 className="gte-drop" style={{ margin: 0, fontSize: 100, lineHeight: 0.9, fontWeight: 800, letterSpacing: "-0.05em", textShadow: final ? `6px 5px 0 ${C.verm}` : "none" }}>
            {final ? "Final Standings" : "Leaderboard"}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 10, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 640 }}>
          <span className="label" style={{ fontSize: 16, letterSpacing: "0.12em", color: C.muted, marginRight: 6 }}>
            {final ? `All ${played.length} played` : "After"}
          </span>
          {played.map((c) => (
            <span key={c} className="mono" style={{ padding: "4px 10px", borderRadius: 8, border: `2px solid ${C.ink}`, background: C.paper2, fontSize: 17, fontWeight: 800 }}>
              {c}
            </span>
          ))}
        </div>
      </div>
      <ol style={{ position: "absolute", left: 56, right: 56, top: 248, margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: rowH > 60 ? 10 : 6 }}>
        {standings.map((s, i) => {
          const champ = final && i === 0;
          return (
            <li
              key={s.id}
              className="gte-rowin"
              style={{
                height: rowH,
                boxSizing: "border-box",
                padding: "0 22px 0 16px",
                display: "grid",
                gridTemplateColumns: "64px 52px 400px minmax(0, 1fr) 132px",
                alignItems: "center",
                columnGap: 18,
                borderRadius: 18,
                border: champ ? `3px solid ${C.ink}` : `2px solid ${C.line}`,
                background: champ ? "#FFE9A6" : C.paper2,
                animationDelay: `${(i * 0.09).toFixed(2)}s`,
              }}
            >
              <span className="mono" style={{ fontSize: rowH > 60 ? 42 : 32, fontWeight: 800, letterSpacing: "-0.05em", textAlign: "center" }}>
                {i + 1}
              </span>
              <Token team={s} index={i} size={rowH > 60 ? 50 : 42} radius={14} />
              <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.025em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
                {champ && (
                  <span className="label" style={{ flex: "none", padding: "4px 10px", borderRadius: 999, background: C.ink, color: C.mari, fontSize: 13, letterSpacing: "0.12em" }}>
                    Champions
                  </span>
                )}
              </span>
              <span style={{ height: rowH > 60 ? 44 : 34, display: "block" }}>
                <span
                  className="gte-grow"
                  style={{ display: "block", width: `${Math.max(2, (s.total / max) * 100).toFixed(1)}%`, height: "100%", boxSizing: "border-box", borderRadius: 10, border: `2.5px solid ${C.ink}`, background: tokenFor(s, i).color, boxShadow: `3px 3px 0 ${C.ink}`, animationDelay: `${(0.25 + i * 0.12).toFixed(2)}s` }}
                />
              </span>
              <span className="mono" style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.04em", textAlign: "right" }}>
                {fmt1(s.total)}
              </span>
            </li>
          );
        })}
      </ol>
      {final && <Confetti pieces={PIECES_LB} />}
    </>
  );
}

export function PhoneLeaderboard({ standings, final, mine, playedCount }: { standings: Standing[]; final: boolean; mine: string; playedCount: number }) {
  const max = Math.max(1, ...standings.map((s) => s.total));
  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18, padding: "22px 20px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="label" style={{ fontSize: 12, color: C.muted }}>
            {final ? `All ${playedCount} questions` : `After ${playedCount} question${playedCount === 1 ? "" : "s"}`}
          </span>
          <h1 style={{ margin: 0, fontSize: 40, lineHeight: 0.95, fontWeight: 800, letterSpacing: "-0.045em", textShadow: final ? `3px 3px 0 ${C.verm}` : "none" }}>{final ? "Final standings" : "Leaderboard"}</h1>
        </div>
        {final && <Trophy size={56} />}
      </div>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
        {standings.map((s, i) => {
          const you = s.id === mine;
          return (
            <li
              key={s.id}
              className="gte-rowin"
              style={{
                padding: "10px 14px 12px 10px",
                display: "grid",
                gridTemplateColumns: "30px 38px minmax(0, 1fr) auto",
                gridTemplateRows: "auto auto",
                columnGap: 10,
                rowGap: 8,
                alignItems: "center",
                border: you ? `3px solid ${C.ink}` : `2px solid ${C.line}`,
                borderRadius: 16,
                background: you ? "#fff" : C.paper2,
                boxShadow: you ? `4px 4px 0 ${C.ink}` : "none",
                animationDelay: `${(i * 0.07).toFixed(2)}s`,
              }}
            >
              <span className="mono" style={{ gridRow: "1 / span 2", fontSize: 24, fontWeight: 800, textAlign: "center" }}>
                {i + 1}
              </span>
              <span style={{ gridRow: "1 / span 2" }}>
                <Token team={s} index={i} size={38} radius={11} />
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 17, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
                {you && (
                  <span className="mono" style={{ flex: "none", padding: "2px 7px", borderRadius: 999, background: C.ink, color: C.paper, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em" }}>
                    YOU
                  </span>
                )}
              </span>
              <span className="mono" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", textAlign: "right" }}>
                {fmt1(s.total)}
              </span>
              <span style={{ gridColumn: "3 / span 2", height: 12, display: "block" }}>
                <span className="gte-grow" style={{ display: "block", width: `${Math.max(3, (s.total / max) * 100).toFixed(1)}%`, height: "100%", boxSizing: "border-box", borderRadius: 999, border: `2px solid ${C.ink}`, background: tokenFor(s, i).color, animationDelay: `${(0.15 + i * 0.1).toFixed(2)}s` }} />
              </span>
            </li>
          );
        })}
      </ol>
    </main>
  );
}

/* ---------------- reveal (projector) ---------------- */

function CorrectStamp({ reason }: { reason?: string }) {
  return (
    <span className="gte-stamp" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 30, padding: "0 10px", borderRadius: 999, border: `2px solid ${C.ink}`, background: C.cobalt, color: C.paper, fontSize: 15, fontWeight: 800 }}>
        <I.check size={14} />
        +2
      </span>
      {reason && (
        <span className="label" style={{ fontSize: 11, letterSpacing: "0.08em", color: C.cobalt }}>
          {reason}
        </span>
      )}
    </span>
  );
}

function NumberLine({ r, teams }: { r: NonNullable<Results["reveal"]>; teams: Team[] }) {
  const tt = r.twoThirds!;
  const picks = r.rows.filter((x) => x.number !== null);
  const pctX = (v: number) => `${Math.max(0, Math.min(100, v))}%`;
  return (
    <figure className="card gte-pop" style={{ margin: "24px 0 0", padding: "20px 24px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
      <figcaption className="mono" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, fontSize: 17, fontWeight: 800 }}>
        <span>
          avg <span style={{ fontSize: 22 }}>{fmt1(tt.average!)}</span> → ⅔ × avg = <span style={{ fontSize: 22, color: C.vermDark }}>{fmt1(tt.target!)}</span>
        </span>
        <span className="label" style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, letterSpacing: "0.08em" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 14, height: 14, borderRadius: 999, boxShadow: `0 0 0 3px ${C.cobalt}` }} />
            +2 for 0
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 14, height: 14, borderRadius: 999, boxShadow: `0 0 0 3px ${C.verm}` }} />
            +2 closest
          </span>
        </span>
      </figcaption>
      <div role="img" aria-label={`Number line of team picks. Average ${fmt1(tt.average!)}, target ${fmt1(tt.target!)}.`} style={{ position: "relative", height: 188, margin: "0 18px" }}>
        <span style={{ position: "absolute", left: 0, right: 0, top: 91, height: 3, background: C.ink }} />
        {Array.from({ length: 11 }, (_, k) => (
          <span key={k} style={{ position: "absolute", left: `${k * 10}%`, top: 85, width: 2, height: 15, marginLeft: -1, background: C.ink }} />
        ))}
        {[
          [0, "0"],
          [50, "50"],
          [100, "100"],
        ].map(([v, l]) => (
          <span key={l} className="mono" style={{ position: "absolute", left: `${v}%`, bottom: 0, transform: "translateX(-50%)", fontSize: 14, fontWeight: 800, color: C.muted }}>
            {l}
          </span>
        ))}
        <span style={{ position: "absolute", left: pctX(tt.target!), top: 22, width: 3, height: 142, marginLeft: -1.5, background: C.verm }} />
        <span className="label" style={{ position: "absolute", left: pctX(tt.target!), top: 0, transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 13, letterSpacing: "0.08em", color: C.vermDark }}>
          TARGET {fmt1(tt.target!)}
        </span>
        <span style={{ position: "absolute", left: pctX(tt.average!), top: 22, width: 0, height: 142, marginLeft: -1, borderLeft: `3px dashed ${C.ink}` }} />
        <span className="label" style={{ position: "absolute", left: pctX(tt.average!), bottom: 0, transform: "translateX(-50%)", whiteSpace: "nowrap", padding: "0 6px", background: C.paper2, fontSize: 13, letterSpacing: "0.08em" }}>
          AVG {fmt1(tt.average!)}
        </span>
        {picks.map((p, k) => {
          const team = teams.find((t) => t.id === p.teamId);
          const up = k % 2 === 0;
          const ring = tt.closest.includes(p.teamId) ? `0 0 0 4px ${C.paper2}, 0 0 0 7px ${C.verm}` : p.number === 0 ? `0 0 0 4px ${C.paper2}, 0 0 0 7px ${C.cobalt}` : undefined;
          return (
            <span key={p.teamId}>
              <span className="mono" style={{ position: "absolute", left: pctX(p.number!), top: up ? 24 : 144, transform: "translateX(-50%)", fontSize: 15, fontWeight: 800 }}>
                {p.number}
              </span>
              <span className="gte-drop" title={`${team?.name}: ${p.number}`} style={{ position: "absolute", left: pctX(p.number!), top: up ? 46 : 104, marginLeft: -18, animationDelay: `${0.1 * k}s` }}>
                <Token team={team} index={k} size={36} radius={10} shadow={ring} />
              </span>
            </span>
          );
        })}
      </div>
    </figure>
  );
}

export function HostReveal({ q, results, teams, showMath }: { q: Question; results: Results; teams: Team[]; showMath: boolean }) {
  const r = results.reveal;
  if (!r) return null;
  const rows = [...r.rows].sort((a, b) => b.points - a.points);
  const team = (id: string) => teams.find((t) => t.id === id);
  const tIndex = (id: string) => teams.findIndex((t) => t.id === id);
  const compact = rows.length > 7;
  return (
    <>
      <div style={{ position: "absolute", left: 56, top: 108, width: 800, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="mono" style={{ padding: "4px 12px", borderRadius: 10, background: C.ink, color: C.paper, fontSize: 22, fontWeight: 800 }}>
            {q.code}
          </span>
          <span className="label" style={{ fontSize: 18, letterSpacing: "0.12em", color: C.muted }}>
            {q.title}
          </span>
          <span className="mono gte-stamp" style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 32, padding: "0 12px", marginLeft: 4, borderRadius: 999, background: C.cobalt, color: C.paper, fontSize: 14, fontWeight: 800, letterSpacing: "0.12em" }}>
            <I.check size={15} />
            ANSWER
          </span>
        </div>
        <p className="serif gte-drop" style={{ margin: "16px 0 0", fontSize: 58, lineHeight: 1.02, letterSpacing: "-0.01em", textWrap: "balance" }}>
          {r.answer}
        </p>
        {showMath ? (
          <div style={{ marginTop: 22 }}>
            <MathCard steps={r.math} />
          </div>
        ) : (
          <>
            <p style={{ margin: "18px 0 0", fontSize: r.insight.length > 330 ? 21 : 24, lineHeight: 1.38, fontWeight: 500, color: C.ink2, textWrap: "pretty" }}>{r.insight}</p>
            {r.twoThirds && r.twoThirds.target !== null && <NumberLine r={r} teams={teams} />}
            {results.table && (
              <div style={{ marginTop: 22 }}>
                <SurgeonTable table={results.table} />
              </div>
            )}
            {q.kind === "pd" && (
              <div style={{ marginTop: 22, width: 560 }}>
                <PayoffMatrix />
              </div>
            )}
            {q.kind === "mcq" && !results.table && (
              <ol style={{ margin: "22px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {q.choices.map((c, i) => {
                  const ok = r.correct.includes(i);
                  return (
                    <li key={c} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px 8px 8px", borderRadius: 14, border: ok ? `2.5px solid ${C.ink}` : `2px dashed ${C.faint}`, background: ok ? C.cobalt : "transparent", color: ok ? C.paper : C.muted, fontSize: 20, fontWeight: 700 }}>
                      <span className="mono" style={{ width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9, background: ok ? C.paper : C.line, color: C.ink, fontSize: 17, fontWeight: 800 }}>
                        {LETTERS[i]}
                      </span>
                      {c}
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
      </div>

      {r.matches ? (
        <section style={{ position: "absolute", left: 904, right: 56, top: 108, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className="label" style={{ margin: 0, fontSize: 18 }}>
            Match results · totals go on the leaderboard
          </h2>
          {r.matches.map((m) => (
            <MatchCard key={m.id} m={m} teams={teams} compact={r.matches!.length > 3} />
          ))}
        </section>
      ) : (
        <section style={{ position: "absolute", left: 904, right: 56, top: 108, display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 className="label" style={{ margin: 0, fontSize: 18 }}>
            Points this question
          </h2>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, background: C.paper2, border: `2.5px solid ${C.ink}`, borderRadius: 18, overflow: "hidden", boxShadow: `5px 5px 0 ${C.ink}` }}>
            <thead>
              <tr className="mono" style={{ background: C.ink, color: C.paper, fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                <th scope="col" style={{ padding: "13px 16px", textAlign: "left" }}>
                  Team
                </th>
                <th scope="col" style={{ padding: "13px 8px", textAlign: "right" }}>
                  Pick
                </th>
                <th scope="col" style={{ padding: "13px 8px", textAlign: "center" }}>
                  Correct
                </th>
                <th scope="col" style={{ padding: "13px 8px", textAlign: "right" }}>
                  Avg vote
                </th>
                <th scope="col" style={{ padding: "13px 16px", textAlign: "right" }}>
                  Points
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const t = team(row.teamId);
                const picked = q.kind === "number" ? row.number : row.choice;
                const pick = picked === null ? "—" : q.kind === "number" ? String(row.number) : LETTERS[row.choice!];
                const reason = q.id === "2a" && row.correct ? (row.number === 0 ? "picked 0" : "closest") : undefined;
                const td = { borderTop: `2px solid ${C.line}` };
                return (
                  <tr key={row.teamId} className="gte-rowin" style={{ background: i === 0 ? "#FFF6D6" : "transparent", animationDelay: `${0.06 * i}s` }}>
                    <th scope="row" style={{ ...td, height: compact ? 54 : 70, padding: "0 8px 0 12px", textAlign: "left", fontWeight: 800 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <Token team={t} index={tIndex(row.teamId)} size={36} radius={10} />
                        <span style={{ maxWidth: 200, fontSize: 19, lineHeight: 1.1, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{t?.name}</span>
                      </span>
                    </th>
                    <td className="mono" style={{ ...td, padding: "0 8px", textAlign: "right", fontSize: 24, fontWeight: 800, color: picked === null ? C.muted : C.ink }}>
                      {pick}
                    </td>
                    <td style={{ ...td, padding: "0 8px", textAlign: "center" }}>
                      {row.correct ? (
                        <CorrectStamp reason={reason} />
                      ) : picked === null ? (
                        <span className="mono" style={{ fontSize: 22, fontWeight: 800, color: C.muted }}>
                          —
                        </span>
                      ) : (
                        <span role="img" aria-label="not correct" style={{ display: "inline-grid", placeItems: "center", width: 30, height: 30, borderRadius: 999, border: `2px dashed ${C.faint}`, color: C.muted }}>
                          <I.x size={13} />
                        </span>
                      )}
                    </td>
                    <td className="mono" style={{ ...td, padding: "0 8px", textAlign: "right", fontSize: 22, fontWeight: 700, color: C.ink2 }}>
                      {row.votes ? fmt1(row.voteAvg) : "—"}
                    </td>
                    <td className="mono" style={{ ...td, padding: "0 16px", textAlign: "right", fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em" }}>
                      {fmt1(row.points)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}

