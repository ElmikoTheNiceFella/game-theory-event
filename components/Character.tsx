import type { CSSProperties } from "react";
import type { Look, Pose } from "@/lib/questions";

// [upperL, foreL, upperR, foreR] in degrees. Left = viewer's left; +deg swings the left arm outward.
const POSES: Record<Pose, [number, number, number, number]> = {
  idle: [8, -4, -8, 4],
  point: [8, -4, -112, -8],
  think: [8, -4, 30, 150],
  shrug: [42, 100, -42, -100],
  cheer: [150, 10, -150, -10],
  wave: [8, -4, -100, -60],
};

const SHOULDER_L = { x: 64, y: 150 };
const SHOULDER_R = { x: 136, y: 150 };
const SEG = 56;

const rot = (deg: number, x: number, y: number): CSSProperties => ({
  transform: `rotate(${deg}deg)`,
  transformOrigin: `${x}px ${y}px`,
  transformBox: "view-box",
  transition: "transform 450ms cubic-bezier(.3,1.4,.5,1)",
});

function Arm({ s, upper, fore, look, waving }: { s: { x: number; y: number }; upper: number; fore: number; look: Look; waving?: boolean }) {
  const sleeve = look.accessory === "labcoat" ? "#f8fafc" : look.accessory === "robe" ? "#0a0a0a" : look.top;
  return (
    <g style={rot(upper, s.x, s.y)}>
      <rect x={s.x - 11} y={s.y - 6} width={22} height={SEG + 10} rx={11} fill={sleeve} />
      <g style={rot(fore, s.x, s.y + SEG)}>
        <g className={waving ? "anim-wave" : undefined} style={{ transformOrigin: `${s.x}px ${s.y + SEG}px`, transformBox: "view-box" }}>
          <rect x={s.x - 10} y={s.y + SEG - 8} width={20} height={SEG} rx={10} fill={sleeve} />
          <circle cx={s.x} cy={s.y + 2 * SEG} r={11} fill={look.skin} />
        </g>
      </g>
    </g>
  );
}

function HairBack({ look }: { look: Look }) {
  if (look.hairStyle === "long") return <rect x={56} y={60} width={88} height={120} rx={36} fill={look.hair} />;
  if (look.hairStyle === "hijab") return <path d="M50 92 Q50 32 100 32 Q150 32 150 92 L160 178 Q100 200 40 178 Z" fill={look.hair} />;
  return null;
}

function HairFront({ look }: { look: Look }) {
  const h = look.hair;
  switch (look.hairStyle) {
    case "short":
      return <path d="M57 86 Q56 40 100 38 Q146 40 143 86 Q130 62 100 62 Q72 62 57 86 Z" fill={h} />;
    case "long":
      return <path d="M57 92 Q54 38 100 37 Q146 38 143 92 Q128 58 100 58 Q72 58 57 92 Z" fill={h} />;
    case "bun":
      return (
        <>
          <circle cx={100} cy={36} r={18} fill={h} />
          <path d="M57 84 Q56 42 100 40 Q144 42 143 84 Q128 60 100 60 Q72 60 57 84 Z" fill={h} />
        </>
      );
    case "curly":
      return (
        <g fill={h}>
          {[62, 76, 92, 108, 124, 138].map((x, i) => (
            <circle key={x} cx={x} cy={i % 2 ? 46 : 54} r={16} />
          ))}
          <circle cx={58} cy={74} r={12} />
          <circle cx={142} cy={74} r={12} />
        </g>
      );
    case "hijab":
      // head covering with an open (featureless) face oval
      return (
        <path
          fillRule="evenodd"
          fill={h}
          d="M100 36 a48 50 0 1 0 0.01 0 Z M100 56 a29 34 0 1 1 -0.01 0 Z"
        />
      );
    default:
      return null;
  }
}

/** A faceless person: no eyes, mouth or eyebrows, by design. */
export function Character({ look, pose = "idle", speaking = false }: { look: Look; pose?: Pose; speaking?: boolean }) {
  const [uL, fL, uR, fR] = POSES[pose];
  const torso = look.accessory === "robe" ? "#0a0a0a" : look.top;
  return (
    <svg viewBox="0 0 200 420" className={`h-full w-auto overflow-visible ${speaking ? "anim-talk" : "anim-breathe"}`} role="img" aria-label={look.name}>
      <ellipse cx={100} cy={412} rx={58} ry={8} fill="rgba(0,0,0,.25)" />
      <HairBack look={look} />
      <rect x={70} y={262} width={26} height={140} rx={10} fill={look.bottom} />
      <rect x={104} y={262} width={26} height={140} rx={10} fill={look.bottom} />
      <ellipse cx={80} cy={404} rx={18} ry={8} fill="#111" />
      <ellipse cx={120} cy={404} rx={18} ry={8} fill="#111" />
      <rect x={88} y={112} width={24} height={34} fill={look.skin} />
      {look.accessory === "robe" ? (
        <path d="M58 150 Q60 136 80 136 L120 136 Q140 136 142 150 L150 372 L50 372 Z" fill={torso} />
      ) : (
        <rect x={58} y={136} width={84} height={140} rx={22} fill={torso} />
      )}
      {look.accessory === "labcoat" && (
        <>
          <path d="M58 158 Q58 136 80 136 L94 136 L94 300 L58 300 Z" fill="#f8fafc" />
          <path d="M142 158 Q142 136 120 136 L106 136 L106 300 L142 300 Z" fill="#f8fafc" />
        </>
      )}
      {look.accessory === "tie" && <path d="M100 140 L108 150 L104 205 L100 214 L96 205 L92 150 Z" fill="#b91c1c" />}
      {look.accessory === "robe" && <path d="M90 136 L100 156 L110 136 Z" fill="#f8fafc" />}
      {look.accessory === "mic" && <circle cx={122} cy={156} r={6} fill="#111" />}
      <Arm s={SHOULDER_L} upper={uL} fore={fL} look={look} />
      <Arm s={SHOULDER_R} upper={uR} fore={fR} look={look} waving={pose === "wave"} />
      {/* head: intentionally featureless */}
      <circle cx={100} cy={84} r={42} fill={look.skin} />
      <HairFront look={look} />
      {look.accessory === "cap" && <path d="M58 70 Q60 36 100 36 Q140 36 142 70 Z" fill={look.top} />}
    </svg>
  );
}
