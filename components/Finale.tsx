"use client";

import { useEffect, useState } from "react";
import type { Standing } from "@/app/actions";
import { C, fmt1, tokenFor } from "@/lib/theme";
import { Confetti, Token, confettiPieces, HostHeader } from "./ui";

const SPEC = {
  1: { height: 330, at: 14, medal: C.mari, label: "Champions", token: 112, num: 200 },
  2: { height: 240, at: 8, medal: "#D9D3C7", label: "Second place", token: 92, num: 160 },
  3: { height: 170, at: 3, medal: "#E39A62", label: "Third place", token: 92, num: 120 },
} as const;
const DISPLAY = [2, 1, 3] as const;
const CAPTIONS: { rank: 1 | 2 | 3; text: string; in: number; out: number }[] = [
  { rank: 3, text: "And in third place…", in: 0.3, out: 2.9 },
  { rank: 2, text: "In second place…", in: 3.6, out: 7.9 },
  { rank: 1, text: "And your champions are…", in: 8.6, out: 13.9 },
];
// three confetti waves: one per podium place
const FALL = confettiPieces(90, 7, (i) => (i < 18 ? [3.4, 0.9] : i < 36 ? [8.4, 0.9] : [14.4, 3.2]));
const DONE_AT = 18500;

/** Dark stage, spotlights, drumroll captions in serif, podium blocks rising 3rd → 2nd → 1st. */
export function Finale({ standings, onDone }: { standings: Standing[]; onDone?: () => void }) {
  const top = standings.slice(0, 3); // shortcut: ties for a podium spot are broken by list order
  const [champs, setChamps] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setChamps(true), 14600);
    const t2 = setTimeout(() => onDone?.(), DONE_AT);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // onDone deliberately omitted: parents re-render every tick and would restart the show
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="inkboard" style={{ position: "absolute", inset: 0, overflow: "hidden", color: C.paper }}>
      <div aria-hidden="true" className="gte-sway" style={{ position: "absolute", left: 0, right: 0, top: -40, height: 980, pointerEvents: "none" }}>
        <svg viewBox="0 0 1600 900" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
          <polygon points="760,0 840,0 1010,900 590,900" fill="#FFF3CF" opacity="0.09" />
          <polygon points="420,0 480,0 620,900 280,900" fill="#FFF3CF" opacity="0.06" />
          <polygon points="1120,0 1180,0 1320,900 980,900" fill="#FFF3CF" opacity="0.06" />
        </svg>
      </div>
      <HostHeader right="The finale" light plain />

      <div style={{ position: "absolute", left: 0, right: 0, top: 118, height: 120, display: "grid", placeItems: "center" }}>
        <div style={{ position: "relative", width: 1200, height: 120 }}>
          {CAPTIONS.filter((c) => c.rank <= top.length).map((c) => (
            <div key={c.rank} style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: 0, animation: `gte-cap-in .5s ease ${c.in}s both, gte-cap-out .35s ease ${c.out}s forwards` }}>
              <span className="serif gte-drum" style={{ fontSize: 84, lineHeight: 1, color: C.mari }}>
                {c.text}
              </span>
            </div>
          ))}
          {champs && (
            <div className="gte-drop" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <span className="serif" style={{ fontSize: 84, lineHeight: 1, color: C.mari }}>
                Your champions
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 640, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 26 }}>
        {DISPLAY.filter((rank) => rank <= top.length).map((rank) => {
          const s = top[rank - 1];
          const p = SPEC[rank];
          return (
            <div key={rank} className="gte-rise" style={{ width: 340, display: "flex", flexDirection: "column", alignItems: "center", animationDelay: `${p.at}s` }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingBottom: 22 }}>
                <div style={{ position: "relative" }}>
                  <Token team={s} index={rank - 1} size={p.token} radius={28} border={4} shadow="6px 6px 0 #000" glyph={0.54} />
                  <span className="mono" style={{ position: "absolute", right: -18, top: -16, width: 52, height: 52, display: "grid", placeItems: "center", boxSizing: "border-box", borderRadius: 999, border: `3px solid ${C.ink}`, background: p.medal, color: C.ink, fontSize: 24, fontWeight: 800, boxShadow: `0 0 0 3px ${p.medal}` }}>
                    {rank}
                  </span>
                </div>
                <span className="label" style={{ fontSize: 14, letterSpacing: "0.16em", color: "#BFB8AA" }}>
                  {p.label}
                </span>
                <span style={{ maxWidth: 340, textAlign: "center", fontSize: s.name.length > 18 ? 30 : 36, lineHeight: 1, fontWeight: 800, letterSpacing: "-0.03em", textWrap: "balance" }}>{s.name}</span>
                <span className="mono" style={{ fontSize: 26, fontWeight: 800, color: C.mari }}>
                  {fmt1(s.total)} pts
                </span>
              </div>
              <div style={{ width: "100%", height: p.height, boxSizing: "border-box", position: "relative", background: C.paper, borderRadius: "18px 18px 0 0", overflow: "hidden", color: C.ink }}>
                <span style={{ position: "absolute", left: 0, right: 0, top: 0, height: 22, background: tokenFor(s, rank - 1).color, borderBottom: `3px solid ${C.ink}` }} />
                <span style={{ position: "absolute", left: 0, right: 0, top: 30, textAlign: "center", fontSize: p.num, lineHeight: 1, fontWeight: 800, letterSpacing: "-0.06em" }}>{rank}</span>
              </div>
            </div>
          );
        })}
      </div>
      <Confetti pieces={FALL} edge={false} />
    </div>
  );
}
