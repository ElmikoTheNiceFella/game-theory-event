"use client";

import { useEffect, useState } from "react";
import { Character } from "./Character";
import { Scene } from "./Scene";
import type { Line, Look, Pose, Question } from "@/lib/questions";
import { C } from "@/lib/theme";

type Nav = { onNext?: () => void; onPrev?: () => void };

/** One line: typewriter + keyboard. Keyed by index so state resets per line. */
function LineBox({ line, speaker, i, total, bottom, onNext, onPrev }: { line: Line; speaker: Look | null; i: number; total: number; bottom: number } & Nav) {
  const [n, setN] = useState(0);
  const done = n >= line.text.length;
  const last = i === total - 1;
  const narr = !speaker;

  useEffect(() => {
    const id = setInterval(() => setN((c) => Math.min(c + 1, line.text.length)), 22);
    return () => clearInterval(id);
  }, [line.text]);

  const next = () => (done ? onNext?.() : setN(line.text.length));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === " " || e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") onPrev?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <button
      type="button"
      onClick={next}
      aria-label="Advance the dialogue"
      className="gte-in"
      style={{
        position: "absolute",
        left: 96,
        right: 96,
        bottom,
        minHeight: 172,
        boxSizing: "border-box",
        padding: "40px 46px 24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 16,
        textAlign: "left",
        background: C.paper2,
        color: C.ink,
        border: `3px solid ${C.ink}`,
        borderRadius: 24,
        boxShadow: `8px 8px 0 ${C.ink}`,
        fontFamily: "inherit",
        cursor: "pointer",
        transition: "bottom 300ms ease",
      }}
    >
      <span
        className={narr ? "serif" : undefined}
        style={{
          position: "absolute",
          top: -27,
          left: 38,
          height: 50,
          boxSizing: "border-box",
          padding: narr ? "0 22px" : "0 22px 0 10px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: `3px solid ${C.ink}`,
          borderRadius: 999,
          background: narr ? C.paper : C.ink,
          color: narr ? C.ink : C.paper,
          fontSize: narr ? 30 : 24,
          fontWeight: narr ? 400 : 800,
          whiteSpace: "nowrap",
        }}
      >
        {speaker && <span style={{ width: 26, height: 26, boxSizing: "border-box", borderRadius: 999, border: `2.5px solid ${C.paper}`, background: speaker.top }} />}
        {speaker?.name ?? "Narrator"}
      </span>
      <span className={narr ? "serif" : undefined} style={{ display: "block", fontSize: narr ? 50 : 38, fontWeight: narr ? 400 : 500, lineHeight: 1.28, letterSpacing: "-0.01em", textWrap: "pretty" }}>
        {line.text.slice(0, n)}
        <span style={{ opacity: 0 }}>{line.text.slice(n)}</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }} aria-hidden="true">
          {Array.from({ length: total }, (_, k) => (
            <span key={k} style={{ width: k === i ? 34 : 12, height: 8, borderRadius: 4, background: k <= i ? C.ink : C.line, transition: "width 300ms ease" }} />
          ))}
        </span>
        <span className="mono" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 800, color: C.muted }}>
          <span>
            {i + 1} / {total}
          </span>
          <kbd className="key" style={{ fontSize: 14, color: C.ink, padding: "3px 9px", borderWidth: "2px 2px 4px", borderColor: C.ink, background: "#fff" }}>
            {last && done ? "Space · answer" : "Space"}
          </kbd>
          <svg className={done ? "gte-caret" : undefined} width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 4l12 8-12 8z" fill={C.ink} />
          </svg>
        </span>
      </span>
    </button>
  );
}

/** Visual-novel scene on the 1600×900 stage. Host-only: Space/→/click advances, ← goes back. */
export function DialogueStage({ q, index, raised, onNext, onPrev }: { q: Question; index: number; raised: boolean } & Nav) {
  const i = Math.min(index, q.dialogue.length - 1);
  const line = q.dialogue[i];
  const keys = Object.keys(q.cast);
  const narr = line.who === "narrator";

  // each character keeps the last pose they used so far
  const poses: Record<string, Pose> = {};
  for (const l of q.dialogue.slice(0, i + 1)) if (l.who !== "narrator") poses[l.who] = l.pose ?? "idle";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: C.ink, userSelect: "none" }}>
      <Scene id={q.scene} step={i} />
      <div style={{ position: "absolute", top: 28, left: 32, display: "flex", alignItems: "center", gap: 12, padding: "7px 20px 7px 7px", background: C.ink, color: C.paper, borderRadius: 999, zIndex: 2 }}>
        <span className="mono" style={{ padding: "5px 12px", borderRadius: 999, background: C.mari, color: C.ink, fontSize: 19, fontWeight: 800 }}>
          {q.code}
        </span>
        <span style={{ fontSize: 21, fontWeight: 800 }}>{q.title}</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 180, height: 468, padding: "0 64px", boxSizing: "border-box", display: "flex", justifyContent: "space-between", alignItems: "flex-end", pointerEvents: "none" }}>
        {keys.map((k, n) => {
          const speaking = line.who === k;
          return (
            <div key={k} className={n === 0 ? "gte-in-l" : n === keys.length - 1 ? "gte-in-r" : "gte-pop"} style={{ height: "100%" }}>
              <div
                style={{
                  height: "100%",
                  transform: `scale(${speaking ? 1.05 : 1})`,
                  transformOrigin: "50% 100%",
                  filter: speaking || narr ? "none" : "saturate(0.55) brightness(0.78)",
                  transition: "transform 450ms cubic-bezier(.3,1.4,.5,1), filter 350ms ease",
                }}
              >
                <div className={speaking ? "gte-talk" : "gte-breathe"} style={{ height: "100%" }}>
                  <Character look={q.cast[k]} pose={poses[k] ?? "idle"} flip={keys.length > 1 && n === keys.length - 1} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <LineBox key={i} line={line} speaker={narr ? null : q.cast[line.who]} i={i} total={q.dialogue.length} bottom={raised ? 112 : 40} onNext={onNext} onPrev={onPrev} />
    </div>
  );
}
