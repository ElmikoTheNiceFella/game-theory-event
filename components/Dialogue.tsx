"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Character } from "./Character";
import { Scene } from "./Scene";
import type { Line, Look, Pose, Question } from "@/lib/questions";

type Nav = { onNext?: () => void; onPrev?: () => void };

/** One line of dialogue: typewriter + keyboard. Keyed by index so state resets per line. */
function LineBox({ line, speaker, label, onNext, onPrev }: { line: Line; speaker: Look | null; label: string } & Nav) {
  const [n, setN] = useState(0);
  const done = n >= line.text.length;

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
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      onClick={next}
      className="absolute inset-x-[5%] bottom-[4%] min-h-[17%] cursor-pointer rounded-3xl border-4 border-white/80 bg-slate-950/85 px-10 py-6 text-white shadow-2xl backdrop-blur"
    >
      <div className={`absolute -top-6 left-8 rounded-xl px-5 py-1.5 text-2xl font-black ${speaker ? "" : "italic"}`} style={{ background: speaker?.top ?? "#475569" }}>
        {speaker?.name ?? "Narrator"}
      </div>
      <p className={`text-[clamp(1.2rem,2.3vw,2.4rem)] leading-snug ${speaker ? "" : "italic text-amber-200"}`}>
        {line.text.slice(0, n)}
        <span className="opacity-0">{line.text.slice(n)}</span>
      </p>
      <div className="absolute right-6 bottom-3 text-sm text-white/60">
        {label} · {done ? "Space ▶" : "…"}
      </div>
    </motion.div>
  );
}

/** Visual-novel scene. With onNext (host), Space/→/click advances and ← goes back. */
export function DialogueStage({ q, index, onNext, onPrev }: { q: Question; index: number } & Nav) {
  const i = Math.min(index, q.dialogue.length - 1);
  const line = q.dialogue[i];
  const keys = Object.keys(q.cast);

  // each character keeps the last pose they used so far
  const poses: Record<string, Pose> = {};
  for (const l of q.dialogue.slice(0, i + 1)) if (l.who !== "narrator") poses[l.who] = l.pose ?? "idle";

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      <Scene id={q.scene} />
      <div className="absolute inset-x-0 bottom-[20%] flex h-[52%] items-end justify-between px-[4%]">
        {keys.map((k, n) => (
          <motion.div
            key={k}
            className="h-full"
            initial={{ x: n < keys.length / 2 ? -600 : 600, opacity: 0 }}
            animate={{ x: 0, opacity: 1, filter: line.who === k || line.who === "narrator" ? "brightness(1)" : "brightness(0.7)", scale: line.who === k ? 1.04 : 1 }}
            transition={{ type: "spring", stiffness: 90, damping: 16, delay: n * 0.15 }}
          >
            <Character look={q.cast[k]} pose={poses[k] ?? "idle"} speaking={line.who === k} />
          </motion.div>
        ))}
      </div>
      <LineBox
        key={i}
        line={line}
        speaker={line.who === "narrator" ? null : q.cast[line.who]}
        label={`${i + 1}/${q.dialogue.length}`}
        onNext={onNext}
        onPrev={onPrev}
      />
    </div>
  );
}
