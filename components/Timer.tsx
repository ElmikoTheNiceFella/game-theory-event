"use client";

/** Ring countdown. `ms` null = no timer. */
export function Timer({ ms, total, paused, size = 160 }: { ms: number | null; total: number; paused?: boolean; size?: number }) {
  if (ms === null) return null;
  const s = Math.ceil(ms / 1000);
  const frac = Math.max(0, Math.min(1, ms / (total * 1000)));
  const r = 44,
    c = 2 * Math.PI * r;
  const color = frac > 0.5 ? "#22c55e" : frac > 0.2 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth={8} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: "stroke-dashoffset .25s linear" }} />
      </svg>
      <span className="font-black tabular-nums" style={{ fontSize: size * 0.28 }}>
        {s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : s}
      </span>
      {paused && <span className="absolute bottom-[18%] text-xs font-bold tracking-widest text-amber-300">PAUSED</span>}
    </div>
  );
}
