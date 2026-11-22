import type { CSSProperties } from "react";
import type { Look, Pose } from "@/lib/questions";
import { C } from "@/lib/theme";

// [upperL, foreL, upperR, foreR] in degrees. Left = viewer's left; +deg swings the left arm outward.
const POSES: Record<Pose, [number, number, number, number]> = {
  idle: [8, -4, -8, 4],
  point: [8, -4, -112, -8],
  think: [8, -4, 30, 150],
  shrug: [42, 100, -42, -100],
  cheer: [150, 10, -150, -10],
  wave: [8, -4, -100, -60],
};

const INK = { stroke: C.ink, strokeWidth: 4 } as const;
const JOIN = { ...INK, strokeLinejoin: "round" as const };

const rot = (deg: number, x: number, y: number): CSSProperties => ({
  transform: `rotate(${deg}deg)`,
  transformOrigin: `${x}px ${y}px`,
  transformBox: "view-box",
  transition: "transform 450ms cubic-bezier(.3,1.4,.5,1)",
});

/** A faceless person (no eyes, mouth or brows, by design): ink outline, flat fills, the arms do the acting. */
export function Character({ look, pose = "idle", flip = false }: { look: Look; pose?: Pose; flip?: boolean }) {
  const [uL, fL, uR, fR] = POSES[pose];
  const a = look.accessory ?? "none";
  const h = look.hairStyle;
  const sleeve = a === "labcoat" ? C.paper2 : a === "robe" ? "#24232B" : look.top;
  return (
    <svg viewBox="0 0 200 420" style={{ height: "100%", width: "auto", display: "block", overflow: "visible", transform: flip ? "scaleX(-1)" : undefined }} role="img" aria-label={look.name}>
      <ellipse cx="100" cy="412" rx="62" ry="8" fill="#000" opacity="0.35" />
      {h === "long" && <rect x="56" y="60" width="88" height="120" rx="36" fill={look.hair} {...INK} />}
      {h === "hijab" && <path d="M50 92 Q50 32 100 32 Q150 32 150 92 L160 178 Q100 200 40 178 Z" fill={look.hair} {...JOIN} />}
      <rect x="70" y="262" width="26" height="140" rx="10" fill={look.bottom} {...INK} />
      <rect x="104" y="262" width="26" height="140" rx="10" fill={look.bottom} {...INK} />
      <ellipse cx="80" cy="404" rx="19" ry="9" fill={C.ink} />
      <ellipse cx="120" cy="404" rx="19" ry="9" fill={C.ink} />
      <rect x="88" y="112" width="24" height="34" fill={look.skin} {...INK} />
      {a === "robe" ? (
        <>
          <path d="M58 150 Q60 136 80 136 L120 136 Q140 136 142 150 L150 372 L50 372 Z" fill="#24232B" {...JOIN} />
          <path d="M90 136 L100 158 L110 136 Z" fill={C.paper2} stroke={C.ink} strokeWidth="3" strokeLinejoin="round" />
        </>
      ) : (
        <rect x="58" y="136" width="84" height="140" rx="22" fill={look.top} {...INK} />
      )}
      {a === "labcoat" && (
        <>
          <path d="M58 158 Q58 136 80 136 L94 136 L94 300 L58 300 Z" fill={C.paper2} {...JOIN} />
          <path d="M142 158 Q142 136 120 136 L106 136 L106 300 L142 300 Z" fill={C.paper2} {...JOIN} />
        </>
      )}
      {a === "tie" && <path d="M100 140 L108 150 L104 205 L100 214 L96 205 L92 150 Z" fill={C.verm} stroke={C.ink} strokeWidth="3" strokeLinejoin="round" />}
      {a === "mic" && <rect x="117" y="148" width="10" height="17" rx="5" fill={C.ink} />}
      <g style={rot(uL, 64, 150)}>
        <rect x="53" y="144" width="22" height="66" rx="11" fill={sleeve} {...INK} />
        <g style={rot(fL, 64, 206)}>
          <rect x="54" y="198" width="20" height="56" rx="10" fill={sleeve} {...INK} />
          <circle cx="64" cy="262" r="11" fill={look.skin} {...INK} />
        </g>
      </g>
      <g style={rot(uR, 136, 150)}>
        <rect x="125" y="144" width="22" height="66" rx="11" fill={sleeve} {...INK} />
        <g style={rot(fR, 136, 206)}>
          <g className={pose === "wave" ? "gte-wave" : undefined}>
            <rect x="126" y="198" width="20" height="56" rx="10" fill={sleeve} {...INK} />
            <circle cx="136" cy="262" r="11" fill={look.skin} {...INK} />
          </g>
        </g>
      </g>
      {/* head: intentionally featureless */}
      <circle cx="100" cy="84" r="42" fill={look.skin} {...INK} />
      {h === "short" && <path d="M57 86 Q56 40 100 38 Q146 40 143 86 Q130 62 100 62 Q72 62 57 86 Z" fill={look.hair} {...JOIN} />}
      {h === "long" && <path d="M57 92 Q54 38 100 37 Q146 38 143 92 Q128 58 100 58 Q72 58 57 92 Z" fill={look.hair} {...JOIN} />}
      {h === "bun" && (
        <>
          <circle cx="100" cy="36" r="18" fill={look.hair} {...INK} />
          <path d="M57 84 Q56 42 100 40 Q144 42 143 84 Q128 60 100 60 Q72 60 57 84 Z" fill={look.hair} {...JOIN} />
        </>
      )}
      {h === "curly" && (
        <>
          <g fill={C.ink}>
            {CURLS.map(([x, y, r]) => (
              <circle key={`o${x}${y}`} cx={x} cy={y} r={r + 4} />
            ))}
          </g>
          <g fill={look.hair}>
            {CURLS.map(([x, y, r]) => (
              <circle key={`i${x}${y}`} cx={x} cy={y} r={r} />
            ))}
          </g>
        </>
      )}
      {h === "hijab" && <path d="M100 36 a48 50 0 1 0 0.01 0 Z M100 56 a29 34 0 1 1 -0.01 0 Z" fill={look.hair} fillRule="evenodd" {...INK} />}
      {a === "cap" && <path d="M58 70 Q60 36 100 36 Q140 36 142 70 Z" fill={look.top} {...JOIN} />}
    </svg>
  );
}

const CURLS: [number, number, number][] = [
  [62, 54, 16],
  [76, 46, 16],
  [92, 54, 16],
  [108, 46, 16],
  [124, 54, 16],
  [138, 46, 16],
  [58, 74, 12],
  [142, 74, 12],
];
