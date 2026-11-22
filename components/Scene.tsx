import type { ReactNode } from "react";
import type { SceneId } from "@/lib/questions";

// 1600x900 backdrops; the floor line sits at y≈720 so characters (bottom-anchored) stand on it.
const W = 1600,
  H = 900,
  FLOOR = 720;

function Frame({ wall, floor, children }: { wall: [string, string]; floor: string; children?: ReactNode }) {
  return (
    <>
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={wall[0]} />
          <stop offset="1" stopColor={wall[1]} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#wall)" />
      <rect y={FLOOR} width={W} height={H - FLOOR} fill={floor} />
      <rect y={FLOOR} width={W} height={6} fill="rgba(0,0,0,.25)" />
      {children}
    </>
  );
}

const Door = ({ x, n, open }: { x: number; n: number; open?: boolean }) => (
  <g>
    <rect x={x} y={300} width={200} height={420} rx={10} fill={open ? "#0b0b14" : "#f59e0b"} stroke="#fde68a" strokeWidth={10} />
    {!open && <circle cx={x + 165} cy={520} r={10} fill="#78350f" />}
    <text x={x + 100} y={280} textAnchor="middle" fontSize={64} fontWeight={800} fill="#fde68a">
      {n}
    </text>
  </g>
);

const SCENES: Record<SceneId, ReactNode> = {
  gameshow: (
    <Frame wall={["#3b0764", "#1e1b4b"]} floor="#4c1d95">
      {[200, 800, 1400].map((x) => (
        <polygon key={x} points={`${x - 40},0 ${x + 40},0 ${x + 220},${FLOOR} ${x - 220},${FLOOR}`} fill="rgba(255,255,255,.05)" />
      ))}
      <Door x={420} n={1} />
      <Door x={700} n={2} />
      <Door x={980} n={3} open />
      <text x={800} y={140} textAnchor="middle" fontSize={84} fontWeight={900} fill="#facc15" letterSpacing={6}>
        PICK-A-DOOR
      </text>
    </Frame>
  ),
  lab: (
    <Frame wall={["#134e4a", "#0f2f2e"]} floor="#1f2937">
      <g transform="translate(470 -40)">
      <rect x={120} y={160} width={420} height={260} rx={12} fill="#0b1f1e" stroke="#5eead4" strokeWidth={6} />
      {Array.from({ length: 9 }).map((_, i) => (
        <g key={i}>
          <circle cx={170 + i * 40} cy={290 + Math.sin(i) * 60} r={10} fill="#5eead4" />
          <circle cx={170 + i * 40} cy={290 - Math.sin(i) * 60} r={10} fill="#f472b6" />
          <line x1={170 + i * 40} x2={170 + i * 40} y1={290 + Math.sin(i) * 60} y2={290 - Math.sin(i) * 60} stroke="#99f6e4" strokeWidth={3} />
        </g>
      ))}
      <text x={330} y={400} textAnchor="middle" fontSize={34} fill="#99f6e4" fontWeight={700}>
        MATCH: 1 in 1,000,000
      </text>
      </g>
      <rect x={1000} y={520} width={480} height={200} fill="#334155" />
      <rect x={980} y={500} width={520} height={24} fill="#64748b" />
      {[1060, 1140, 1220].map((x, i) => (
        <rect key={x} x={x} y={430} width={30} height={70} rx={8} fill={["#f472b6", "#60a5fa", "#facc15"][i]} />
      ))}
      <rect x={1320} y={400} width={30} height={100} fill="#1f2937" />
      <circle cx={1335} cy={390} r={30} fill="#475569" />
    </Frame>
  ),
  hospital: (
    <Frame wall={["#e0f2fe", "#bae6fd"]} floor="#94a3b8">
      <rect x={1080} y={140} width={360} height={260} fill="#7dd3fc" stroke="#f8fafc" strokeWidth={14} />
      <line x1={1260} x2={1260} y1={140} y2={400} stroke="#f8fafc" strokeWidth={10} />
      <rect x={560} y={200} width={480} height={260} rx={10} fill="#ffffff" stroke="#0ea5e9" strokeWidth={6} />
      <text x={600} y={270} fontSize={44} fontWeight={800} fill="#0369a1">Surgeon A — 95%</text>
      <text x={600} y={350} fontSize={44} fontWeight={800} fill="#0369a1">Surgeon B — 90%</text>
      <text x={600} y={420} fontSize={28} fill="#64748b">overall success</text>
      <rect x={1040} y={560} width={420} height={70} rx={14} fill="#f8fafc" />
      <rect x={1040} y={620} width={420} height={30} fill="#cbd5e1" />
      <rect x={1060} y={650} width={14} height={70} fill="#64748b" />
      <rect x={1426} y={650} width={14} height={70} fill="#64748b" />
      <path d="M770 70 h40 v-40 h40 v40 h40 v40 h-40 v40 h-40 v-40 h-40 Z" fill="#ef4444" />
    </Frame>
  ),
  classroom: (
    <Frame wall={["#fef3c7", "#fde68a"]} floor="#a16207">
      <rect x={300} y={50} width={1000} height={290} rx={12} fill="#14532d" stroke="#854d0e" strokeWidth={18} />
      <text x={800} y={160} textAnchor="middle" fontSize={80} fill="#f0fdf4" fontWeight={700} fontFamily="cursive">
        target = ⅔ × average
      </text>
      <text x={800} y={250} textAnchor="middle" fontSize={48} fill="#bbf7d0" fontFamily="cursive">
        pick 0 … 100
      </text>
      {[140, 1340].map((x) => (
        <g key={x}>
          <rect x={x} y={610} width={160} height={20} fill="#78350f" />
          <rect x={x + 10} y={630} width={14} height={90} fill="#78350f" />
          <rect x={x + 136} y={630} width={14} height={90} fill="#78350f" />
        </g>
      ))}
    </Frame>
  ),
  arena: (
    <Frame wall={["#0f172a", "#020617"]} floor="#1e293b">
      <rect x={0} y={0} width={800} height={FLOOR} fill="rgba(220,38,38,.18)" />
      <rect x={800} y={0} width={800} height={FLOOR} fill="rgba(37,99,235,.18)" />
      <g fontWeight={900} fontSize={40} textAnchor="middle">
        <rect x={560} y={60} width={480} height={220} rx={16} fill="#0b1222" stroke="#e2e8f0" strokeWidth={4} />
        <text x={800} y={108} fill="#e2e8f0">COOPERATE</text>
        <text x={800} y={150} fill="#e2e8f0" fontSize={28}>3 / 3 · 0 / 5</text>
        <text x={800} y={210} fill="#e2e8f0">DEFECT</text>
        <text x={800} y={252} fill="#e2e8f0" fontSize={28}>5 / 0 · 1 / 1</text>
      </g>
      <rect x={180} y={560} width={220} height={160} rx={12} fill="#7f1d1d" />
      <rect x={1200} y={560} width={220} height={160} rx={12} fill="#1e3a8a" />
      <circle cx={250} cy={560} r={28} fill="#22c55e" />
      <circle cx={330} cy={560} r={28} fill="#ef4444" />
      <circle cx={1270} cy={560} r={28} fill="#22c55e" />
      <circle cx={1350} cy={560} r={28} fill="#ef4444" />
    </Frame>
  ),
  courtroom: (
    <Frame wall={["#78350f", "#451a03"]} floor="#292524">
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x={i * 200 + 20} y={60} width={160} height={560} fill="rgba(255,255,255,.04)" />
      ))}
      <rect x={560} y={380} width={480} height={340} fill="#92400e" stroke="#b45309" strokeWidth={8} />
      <circle cx={800} cy={130} r={85} fill="#facc15" opacity={0.85} />
      <path d="M800 70 v120 M740 100 h120 M740 100 l-25 50 h50 Z M860 100 l-25 50 h50 Z" stroke="#78350f" strokeWidth={8} fill="#78350f" />
      <rect x={100} y={600} width={340} height={120} fill="#7c2d12" />
      <rect x={1160} y={600} width={340} height={120} fill="#7c2d12" />
    </Frame>
  ),
  airfield: (
    <Frame wall={["#7dd3fc", "#e0f2fe"]} floor="#4b5563">
      <circle cx={1400} cy={140} r={70} fill="#fde047" />
      <rect y={FLOOR + 70} width={W} height={20} fill="#f8fafc" opacity={0.6} />
      <g transform="translate(800 400)">
        <ellipse cx={0} cy={0} rx={330} ry={46} fill="#64748b" />
        <path d="M-60 -10 L-420 120 L-380 150 L40 30 Z" fill="#94a3b8" />
        <path d="M-60 -10 L-420 -140 L-380 -170 L40 -30 Z" fill="#94a3b8" />
        <path d="M250 -10 L380 -140 L420 -130 L330 0 Z" fill="#94a3b8" />
        <ellipse cx={-280} cy={-4} rx={40} ry={26} fill="#1e293b" />
        <circle cx={-60} cy={-80} r={22} fill="#334155" />
        <circle cx={-60} cy={80} r={22} fill="#334155" />
        {[
          [-300, 100], [-250, 80], [-200, 60], [-330, -110], [-260, -90], [-190, -70], [-150, 40], [-140, -50],
          [330, -100], [360, -120], [300, -60], [200, -10], [150, 10], [250, 8],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={8} fill="#dc2626" />
        ))}
      </g>
    </Frame>
  ),
  hall: (
    <Frame wall={["#1e1b4b", "#0f0a2e"]} floor="#312e81">
      <rect x={400} y={100} width={800} height={420} rx={16} fill="#0b0a1f" stroke="#a78bfa" strokeWidth={6} />
      <text x={800} y={170} textAnchor="middle" fontSize={44} fontWeight={800} fill="#c4b5fd">
        LEADERBOARD
      </text>
      {[560, 420, 300, 220].map((w, i) => (
        <rect key={i} x={480} y={210 + i * 70} width={w} height={46} rx={10} fill={["#facc15", "#a78bfa", "#60a5fa", "#34d399"][i]} />
      ))}
      {[150, 1450].map((x) => (
        <polygon key={x} points={`${x - 30},0 ${x + 30},0 ${x + 160},${FLOOR} ${x - 160},${FLOOR}`} fill="rgba(167,139,250,.08)" />
      ))}
    </Frame>
  ),
};

export function Scene({ id }: { id: SceneId }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      {SCENES[id]}
    </svg>
  );
}
