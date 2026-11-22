"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import type { Standing } from "@/app/actions";

const PLACES = [
  { rank: 3, label: "Third place", height: "35%", order: 3, at: 3000 },
  { rank: 2, label: "Second place", height: "50%", order: 1, at: 8000 },
  { rank: 1, label: "Champions", height: "68%", order: 2, at: 14000 },
];

/** Top-3 reveal: drumroll caption, then 3rd → 2nd → 1st rising on a podium, confetti for the winner. */
export function Finale({ standings, onDone }: { standings: Standing[]; onDone?: () => void }) {
  const [step, setStep] = useState(0); // number of places revealed
  const top = standings.slice(0, 3); // shortcut: ties for a podium spot are broken by list order

  useEffect(() => {
    const timers = PLACES.slice(0, top.length).map((p, i) =>
      setTimeout(() => {
        setStep(i + 1);
        if (p.rank === 1) {
          const end = Date.now() + 4000;
          const burst = () => {
            confetti({ particleCount: 60, spread: 80, origin: { x: Math.random(), y: 0.3 } });
            if (Date.now() < end) setTimeout(burst, 250);
          };
          burst();
        } else confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      }, p.at),
    );
    const done = setTimeout(() => onDone?.(), (PLACES[top.length - 1]?.at ?? 0) + 4500);
    return () => [...timers, done].forEach(clearTimeout);
    // onDone deliberately omitted: parents re-render every tick and would restart the show
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top.length]);

  const nextUp = PLACES[step];
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-end overflow-hidden bg-[radial-gradient(ellipse_at_top,#4c1d95,#0b0820_70%)] pb-10">
      <AnimatePresence mode="wait">
        {nextUp && step < top.length && (
          <motion.div
            key={nextUp.rank}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: [1, 1.06, 1] }}
            exit={{ opacity: 0 }}
            transition={{ scale: { repeat: Infinity, duration: 0.5 } }}
            className="absolute top-[18%] text-center text-6xl font-black text-amber-200"
          >
            🥁 And in {nextUp.rank === 1 ? "FIRST" : nextUp.rank === 2 ? "second" : "third"} place…
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex h-[70%] w-full max-w-5xl items-end justify-center gap-6">
        {PLACES.slice(0, top.length)
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((p) => {
            const s = top[p.rank - 1];
            const shown = step >= PLACES.indexOf(p) + 1;
            return (
              <div key={p.rank} className="flex h-full flex-1 flex-col items-center justify-end">
                <AnimatePresence>
                  {shown && (
                    <motion.div initial={{ y: 40, opacity: 0, scale: 0.5 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 120, damping: 12 }} className="mb-4 text-center">
                      <div className="text-6xl">{p.rank === 1 ? "🏆" : p.rank === 2 ? "🥈" : "🥉"}</div>
                      <div className="text-4xl font-black" style={{ color: s.color }}>
                        {s.name}
                      </div>
                      <div className="text-2xl text-white/80">{Math.round(s.total * 100) / 100} pts</div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.div
                  className="flex w-full items-start justify-center rounded-t-2xl pt-4 text-7xl font-black text-white/90"
                  style={{ background: shown ? s.color : "rgba(255,255,255,.1)" }}
                  initial={{ height: 0 }}
                  animate={{ height: shown ? p.height : "8%" }}
                  transition={{ type: "spring", stiffness: 60, damping: 14 }}
                >
                  {p.rank}
                </motion.div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
