"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { C, tokenFor } from "@/lib/theme";

/* ---------------- icons (inline stroke/fill SVG, never emoji) ---------------- */

const stroke = (d: string, w = 2.6) =>
  function Icon({ size = 18, style }: { size?: number; style?: CSSProperties }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
        <path d={d} />
      </svg>
    );
  };
const fill = (d: string) =>
  function Icon({ size = 16, style }: { size?: number; style?: CSSProperties }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={style}>
        <path d={d} fill="currentColor" />
      </svg>
    );
  };

export const I = {
  play: fill("M7 4l12 8-12 8z"),
  back: fill("M17 4L5 12l12 8z"),
  pause: fill("M6 4.5h4v15H6zM14 4.5h4v15h-4z"),
  end: fill("M4 5l10 7-10 7zM16 5h3.5v14H16z"),
  plus: stroke("M12 5v14M5 12h14", 3),
  minus: stroke("M5 12h14", 3.2),
  list: stroke("M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01", 2.4),
  reset: stroke("M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4v5h5", 2.4),
  check: stroke("M5 12.5l5 5L19 7", 3.2),
  x: stroke("M6 6l12 12M18 6L6 18", 3.2),
  arrow: stroke("M5 12h14M13 6l6 6-6 6", 2.8),
  lock: stroke("M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3", 2.6),
  alert: stroke("M12 3l10 18H2zM12 10v4.5M12 17.6v.4", 2.6),
  mic: stroke("M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21", 2.4),
  trophyOutline: stroke("M8 4h8v5a4 4 0 0 1-8 0zM8 6H5.5a2.5 2.5 0 0 0 2.6 3.6M16 6h2.5a2.5 2.5 0 0 1-2.6 3.6M12 13v4M8.5 20.5h7", 2.2),
};

export function Trophy({ size = 84 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" fill={C.mari} />
      <path d="M8 6H5.5a2.5 2.5 0 0 0 2.6 3.6M16 6h2.5a2.5 2.5 0 0 1-2.6 3.6M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z" />
    </svg>
  );
}

export function Logo({ light = false, filled = false }: { light?: boolean; filled?: boolean }) {
  const s = light ? C.paper : C.ink;
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <rect x="1.5" y="1.5" width="23" height="23" fill={filled ? C.paper2 : "none"} stroke={s} strokeWidth="2.5" />
      <path d="M13 1.5V24.5M1.5 13H24.5" stroke={s} strokeWidth="2.5" />
      <rect x="14.5" y="14.5" width="8.5" height="8.5" fill={filled ? C.ink : C.verm} />
    </svg>
  );
}

/* ---------------- team pieces ---------------- */

export function Glyph({ d, size, color = C.ink }: { d: string; size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill={color} fillRule="evenodd" />
    </svg>
  );
}

type TeamLike = { name: string; color: string };

/** A team's game piece: shape on its color (or on paper when `inverted`). */
export function Token({
  team,
  index = 0,
  size = 46,
  radius,
  border = 2.5,
  shadow,
  inverted = false,
  glyph = 0.55,
  className = "",
}: {
  team?: TeamLike;
  index?: number;
  size?: number;
  radius?: number;
  border?: number;
  shadow?: string;
  inverted?: boolean;
  glyph?: number;
  className?: string;
}) {
  const t = tokenFor(team, index);
  return (
    <span
      className={`token ${className}`}
      style={{
        width: size,
        height: size,
        flex: "none",
        display: "grid",
        placeItems: "center",
        boxSizing: "border-box",
        borderRadius: radius ?? Math.round(size * 0.28),
        border: `${border}px solid ${C.ink}`,
        background: inverted ? C.paper2 : t.color,
        boxShadow: shadow,
      }}
    >
      <Glyph d={t.d} size={Math.round(size * glyph)} />
    </span>
  );
}

/** Round pill: token + name (used in headers, chips, lists). */
export function TeamPill({ team, index = 0, size = 38, fontSize = 15, inverted = false }: { team: TeamLike; index?: number; size?: number; fontSize?: number; inverted?: boolean }) {
  const t = tokenFor(team, index);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        maxWidth: 220,
        height: size,
        boxSizing: "border-box",
        padding: "0 12px 0 4px",
        border: `2px solid ${C.ink}`,
        borderRadius: 999,
        background: inverted ? C.paper2 : t.color,
        fontSize,
        fontWeight: 800,
      }}
    >
      <span style={{ width: size - 10, height: size - 10, flex: "none", display: "grid", placeItems: "center", boxSizing: "border-box", borderRadius: 999, border: `2px solid ${C.ink}`, background: inverted ? t.color : C.paper2 }}>
        <Glyph d={t.d} size={Math.round((size - 10) * 0.5)} />
      </span>
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team.name}</span>
    </span>
  );
}

/** Progress chip: dashed when pending, filled + check (stamped) when done. */
export function StatusChip({ team, index = 0, done, height = 50, label }: { team: TeamLike; index?: number; done: boolean; height?: number; label: string }) {
  const t = tokenFor(team, index);
  const inner = height - 16;
  return (
    <li
      className={done ? "gte-chip" : ""}
      style={{
        height,
        boxSizing: "border-box",
        padding: "0 12px 0 6px",
        display: "flex",
        alignItems: "center",
        gap: 9,
        border: done ? `2px solid ${C.ink}` : `2px dashed ${C.faint}`,
        borderRadius: 999,
        background: done ? t.color : "transparent",
      }}
    >
      <span style={{ width: inner, height: inner, flex: "none", display: "grid", placeItems: "center", boxSizing: "border-box", borderRadius: 999, border: `2px solid ${done ? C.ink : C.faint}`, background: done ? C.paper2 : "transparent" }}>
        <Glyph d={t.d} size={Math.round(inner * 0.5)} color={done ? C.ink : C.faint} />
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 800, color: done ? C.ink : C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team.name}</span>
      {done && (
        <span role="img" aria-label={label} style={{ display: "flex" }}>
          <I.check size={20} />
        </span>
      )}
    </li>
  );
}

/* ---------------- timers ---------------- */

const CIRC = 263.9;
export const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : String(s);
};

/** Projector ring timer. Over half: paper; under half: marigold; last fifth: vermilion + pulse; paused: hatched; past total: blue +1 segment. */
export function Ring({
  ms,
  total,
  size,
  paused,
  tag,
  fontSize,
  onColor = false,
  states = true,
}: {
  ms: number | null;
  total: number;
  size: number;
  paused?: boolean;
  tag?: string;
  fontSize?: number;
  onColor?: boolean;
  states?: boolean;
}) {
  if (ms === null) return null;
  const frac = ms / (total * 1000);
  const extra = frac > 1;
  const f = Math.max(0, Math.min(1, frac));
  const disc = !states || paused || extra ? C.paper2 : f > 0.5 ? C.paper2 : f > 0.2 ? C.mari : C.verm;
  const last = states && !paused && f <= 0.2;
  const secsOnly = ms < 60000;
  const label = paused ? "paused" : extra ? "+1 min added" : (tag ?? (secsOnly ? "seconds" : "left"));
  return (
    <div className={last ? "gte-pulse" : ""} style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }} aria-hidden="true">
        <defs>
          <pattern id="gte-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="2" height="5" fill={C.ink} opacity="0.28" />
          </pattern>
        </defs>
        <circle cx="50" cy="50" r="48.5" fill="none" stroke={C.ink} strokeWidth="2" strokeDasharray="0.8 4.279" />
        <circle cx="50" cy="50" r="38.5" fill={disc} style={{ transition: "fill 400ms ease" }} />
        {paused && <circle cx="50" cy="50" r="38.5" fill="url(#gte-hatch)" />}
        <circle cx="50" cy="50" r="42" fill="none" stroke={onColor ? "rgba(23,22,28,.2)" : C.line} strokeWidth="6.5" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={C.ink}
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={extra ? 0 : CIRC * (1 - f)}
          transform="rotate(-90 50 50)"
          opacity={paused ? 0.35 : 1}
          style={{ transition: "stroke-dashoffset 250ms linear" }}
        />
        {extra && <circle cx="50" cy="50" r="42" fill="none" stroke={C.cobalt} strokeWidth="6.5" strokeLinecap="round" strokeDasharray="26.4 300" transform="rotate(-90 50 50)" />}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <span className="mono" style={{ fontSize: fontSize ?? size * 0.26, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 0.95, fontVariantNumeric: "tabular-nums" }}>
          {clock(ms)}
        </span>
        <span className="label" style={{ fontSize: Math.max(10, size * 0.055), letterSpacing: "0.14em" }}>
          {label}
        </span>
      </div>
    </div>
  );
}

/** Small solid ring for phones. */
export function MiniRing({ ms, total, size = 52, width = 14, track = C.line }: { ms: number; total: number; size?: number; width?: number; track?: string }) {
  const c = 251.3;
  const f = Math.max(0, Math.min(1, ms / (total * 1000)));
  return (
    <span style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden="true">
        <circle cx="50" cy="50" r="40" fill="none" stroke={track} strokeWidth={width} />
        <circle cx="50" cy="50" r="40" fill="none" stroke={C.ink} strokeWidth={width} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - f)} transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 250ms linear" }} />
      </svg>
    </span>
  );
}

/* ---------------- projector chrome ---------------- */

const subscribeResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const viewport = () => `${window.innerWidth}x${window.innerHeight}`;

/** Design space is 1600×900; on other aspect ratios the stage grows wider or taller (no letterbox), and layouts anchored to the edges stretch with it. */
export function Stage({ children }: { children: ReactNode }) {
  const [vw, vh] = useSyncExternalStore(subscribeResize, viewport, () => "1600x900").split("x").map(Number);
  const wide = vw / vh >= 16 / 9;
  const w = wide ? (900 * vw) / vh : 1600;
  const h = wide ? 900 : (1600 * vh) / vw;
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      <div style={{ width: w, height: h, position: "absolute", left: 0, top: 0, overflow: "hidden", transform: `scale(${vh / h})`, transformOrigin: "0 0" }}>{children}</div>
    </div>
  );
}

export function HostHeader({ right, light = false, plain = false }: { right: ReactNode; light?: boolean; plain?: boolean }) {
  return (
    <header
      className="mono"
      style={{
        position: "absolute",
        left: 56,
        right: 56,
        top: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        paddingBottom: plain ? 0 : 16,
        borderBottom: plain ? "none" : `2.5px solid ${C.ink}`,
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: light ? "#BFB8AA" : C.ink,
        zIndex: 2,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Logo light={light} />
        Game Theory Event
      </span>
      <span style={{ color: light ? "#BFB8AA" : C.muted }}>{right}</span>
    </header>
  );
}

export function ControlBar({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav
      aria-label="Organizer controls"
      style={{
        position: "absolute",
        left: "50%",
        bottom: 22,
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: 8,
        background: C.ink,
        color: C.paper,
        border: "1.5px solid #3A3842",
        borderRadius: 18,
        boxShadow: "0 12px 32px rgba(23,22,28,0.3)",
        whiteSpace: "nowrap",
        zIndex: 20,
      }}
    >
      <span className="label" style={{ display: "flex", alignItems: "center", gap: 9, height: 46, padding: "0 14px 0 12px", fontSize: 14, color: "#BFB8AA" }}>
        <span style={{ width: 9, height: 9, borderRadius: 999, background: C.verm }} />
        {label}
      </span>
      {children}
      <span className="mono" style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px 0 6px", fontSize: 13, fontWeight: 700, color: "#A39C8F" }}>
        <kbd className="key" style={{ fontSize: 13, color: C.paper, padding: "3px 8px", borderWidth: "1.5px 1.5px 3px", borderColor: "#5A5763", borderRadius: 6 }}>
          H
        </kbd>
        hide
      </span>
    </nav>
  );
}

export const Sep = () => <span style={{ width: 1.5, height: 28, background: "#3A3842", flex: "none" }} />;

/* ---------------- shared bits ---------------- */

export function CodePill({ code, dark = true, size = 22 }: { code: string; dark?: boolean; size?: number }) {
  return (
    <span className="mono" style={{ padding: "4px 12px", borderRadius: 10, background: dark ? C.ink : C.mari, color: dark ? C.paper : C.ink, fontSize: size, fontWeight: 800 }}>
      {code}
    </span>
  );
}

export function Bullets({ items, size = 25, gap = 14, dot = 10 }: { items: string[]; size?: number; gap?: number; dot?: number }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap, fontSize: size, lineHeight: 1.35, fontWeight: 500, color: C.ink2 }}>
      {items.map((s) => (
        <li key={s} style={{ display: "flex", gap: Math.round(dot * 1.4) }}>
          <span style={{ width: dot, height: dot, flex: "none", marginTop: size * 0.5, background: C.ink }} />
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

/** Deterministic confetti pieces (CSS-animated paper bits with ink edges). */
export function confettiPieces(n: number, seed: number, wave?: (i: number) => [number, number]) {
  let s = seed;
  const r = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const colors = ["#FF6B4A", "#6C8CFF", "#34C77B", "#FFC531", "#B58CFF", "#FF7FB8", "#22C3C0", "#F4EFE6"];
  return Array.from({ length: n }, (_, i) => {
    const kind = Math.floor(r() * 3);
    const [start, spread] = wave ? wave(i) : [0.4, 1.6];
    return {
      left: `${(r() * 100).toFixed(2)}%`,
      w: kind === 2 ? 8 : 14,
      h: kind === 2 ? 26 : 14,
      radius: kind === 1 ? 999 : 2,
      color: colors[i % colors.length],
      dur: `${(3 + r() * 2.4).toFixed(2)}s`,
      delay: `${(start + r() * spread).toFixed(2)}s`,
    };
  });
}

export function Confetti({ pieces, edge = true }: { pieces: ReturnType<typeof confettiPieces>; edge?: boolean }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 5 }}>
      {pieces.map((c, i) => (
        <span
          key={i}
          className="gte-fall"
          style={{ position: "absolute", top: 0, left: c.left, width: c.w, height: c.h, borderRadius: c.radius, background: c.color, border: edge ? `1.5px solid ${C.ink}` : undefined, animationDuration: c.dur, animationDelay: c.delay }}
        />
      ))}
    </div>
  );
}

/* ---------------- buttons & dialogs ---------------- */

/** Button for async actions: shows a spinner and ignores presses until the action settles. */
export function Btn({ onClick, children, disabled, ...rest }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & { onClick: () => unknown }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      onClick={async () => {
        setPending(true);
        try {
          await onClick();
        } finally {
          setPending(false);
        }
      }}
    >
      {pending && <span className="gte-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Native modal <dialog>: focus trap, Esc and backdrop for free. Calls onClose however it closes. */
export function ConfirmModal({ title, body, confirmLabel, onConfirm, onClose }: { title: string; body: ReactNode; confirmLabel: string; onConfirm: () => Promise<unknown>; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="gte-modal-title" className="gte-modal gte-pop" style={{ width: "min(460px, calc(100vw - 32px))", boxSizing: "border-box", padding: 0, border: `3px solid ${C.ink}`, borderRadius: 22, background: C.paper2, color: C.ink, boxShadow: `8px 8px 0 ${C.ink}` }}>
      <div style={{ padding: "24px 26px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 id="gte-modal-title" style={{ margin: 0, fontSize: 28, lineHeight: 1.05, fontWeight: 800, letterSpacing: "-0.03em" }}>
          {title}
        </h2>
        <div style={{ fontSize: 17, lineHeight: 1.4, color: C.ink2 }}>{body}</div>
        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button type="button" className="btn btn-paper" onClick={() => ref.current?.close()} style={{ height: 50, padding: "0 20px", fontSize: 18 }}>
            Cancel
          </button>
          <Btn
            className="btn btn-primary"
            onClick={async () => {
              await onConfirm();
              ref.current?.close();
            }}
            style={{ height: 50, padding: "0 20px", fontSize: 18 }}
          >
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </dialog>
  );
}
