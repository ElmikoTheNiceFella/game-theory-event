import type { ReactNode } from "react";
import type { SceneId } from "@/lib/questions";
import { C } from "@/lib/theme";

// 1600×900 backdrops in the Game Night Press style: flat color walls with dots, ink outlines,
// an ink floor with a marigold stripe at y≈720. Characters stand at the far left/right (and center
// when there are three), so key signage sits top-center or between them.
const FLOOR = 720;
const K = { stroke: C.ink, strokeWidth: 5, strokeLinejoin: "round" as const };

function Room({ wall, children, dots = 0.13 }: { wall: string; children?: ReactNode; dots?: number }) {
  return (
    <>
      <defs>
        <pattern id="gte-dots-scene" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="9" cy="9" r="2.1" fill={C.paper} opacity={dots} />
        </pattern>
        <pattern id="gte-floor-scene" width="44" height="44" patternUnits="userSpaceOnUse">
          <path d="M0 44L44 0" stroke="#2A2933" strokeWidth="3" />
        </pattern>
      </defs>
      <rect width="1600" height={FLOOR} fill={wall} />
      <rect width="1600" height={FLOOR} fill="url(#gte-dots-scene)" />
      {children}
      <rect y={FLOOR} width="1600" height="180" fill={C.ink} />
      <rect y={FLOOR} width="1600" height="180" fill="url(#gte-floor-scene)" />
      <rect y="714" width="1600" height="12" fill={C.mari} stroke={C.ink} strokeWidth="3" />
    </>
  );
}

function T(p: { x: number; y: number; size: number; fill: string; font?: "mono" | "display" | "serif"; children: ReactNode; spacing?: number }) {
  return (
    <text
      x={p.x}
      y={p.y}
      fill={p.fill}
      style={{
        textAnchor: "middle",
        fontFamily: p.font === "mono" ? "var(--font-jetbrains), monospace" : p.font === "serif" ? "var(--font-serif), Georgia, serif" : "var(--font-display), sans-serif",
        fontStyle: p.font === "serif" ? "italic" : "normal",
        fontWeight: p.font === "serif" ? 400 : 800,
        fontSize: p.size,
        letterSpacing: p.spacing ?? 0,
      }}
    >
      {p.children}
    </text>
  );
}

function valance() {
  let d = "M0 0 H1600 V52";
  for (let x = 1600; x > 0; x -= 80) d += ` Q${x - 40} 104 ${x - 80} 52`;
  return d + " Z";
}
const VALANCE = valance();

function Door({ x, n, open }: { x: number; n: number; open?: boolean }) {
  return (
    <g>
      <rect x={x - 14} y="286" width="228" height="434" rx="14" fill={C.ink} />
      {open ? (
        <g className="gte-drop">
          <rect x={x} y="300" width="200" height="420" rx="8" fill="#0E0D1A" {...K} />
          <polygon points={`${x + 6},716 ${x + 194},716 ${x + 160},630 ${x + 40},630`} fill="#211F2E" />
          <polygon points={`${x},300 ${x - 60},284 ${x - 60},736 ${x},720`} fill={C.mari} {...K} />
          <circle cx={x - 46} cy="520" r="7" fill={C.ink} />
        </g>
      ) : (
        <>
          <rect x={x} y="300" width="200" height="420" rx="8" fill={C.mari} {...K} />
          <rect x={x + 24} y="326" width="152" height="160" rx="6" fill="none" stroke="#D99A00" strokeWidth="5" />
          <rect x={x + 24} y="510" width="152" height="182" rx="6" fill="none" stroke="#D99A00" strokeWidth="5" />
          <circle cx={x + 170} cy="520" r="10" fill={C.ink} />
        </>
      )}
      <circle cx={x + 100} cy="250" r="31" fill={C.paper} {...K} />
      <T x={x + 100} y={266} size={44} fill={C.ink} font="mono">
        {n}
      </T>
    </g>
  );
}

/** 1A: doors react to the story (Door 1 picked from card 2, Door 3 opens from card 3). */
function GameShow({ step }: { step: number }) {
  return (
    <Room wall={C.cobalt}>
      <path d="M330 720 V370 Q330 222 800 222 Q1270 222 1270 370 V720 Z" fill="#22389F" {...K} />
      <polygon points="720,0 880,0 1210,720 390,720" fill="#FFF3CF" opacity="0.1" />
      <polygon points="160,0 250,0 440,720 -40,720" fill="#FFF3CF" opacity="0.1" />
      <polygon points="1350,0 1440,0 1640,720 1160,720" fill="#FFF3CF" opacity="0.1" />
      <path d="M0 0 H170 Q128 300 150 520 Q160 640 120 720 H0 Z" fill={C.verm} {...K} />
      <path d="M44 0 Q34 360 40 720 M98 0 Q80 360 86 720" fill="none" stroke={C.vermDark} strokeWidth="7" strokeLinecap="round" />
      <path d="M1600 0 H1430 Q1472 300 1450 520 Q1440 640 1480 720 H1600 Z" fill={C.verm} {...K} />
      <path d="M1556 0 Q1566 360 1560 720 M1502 0 Q1520 360 1514 720" fill="none" stroke={C.vermDark} strokeWidth="7" strokeLinecap="round" />
      <path d={VALANCE} fill={C.verm} {...K} />
      <rect x="500" y="74" width="600" height="124" rx="22" fill={C.ink} stroke={C.mari} strokeWidth="6" />
      <rect x="516" y="90" width="568" height="92" rx="12" fill="none" stroke="#FFF1C2" strokeWidth="8" strokeLinecap="round" strokeDasharray="0 24" />
      <T x={800} y={158} size={64} fill={C.mari} spacing={3}>
        PICK-A-DOOR
      </T>
      <Door x={420} n={1} />
      <Door x={700} n={2} />
      <Door x={980} n={3} open={step >= 2} />
      {step >= 1 && (
        <g className="gte-drop">
          <rect x="396" y="276" width="248" height="454" rx="20" fill="none" stroke={C.verm} strokeWidth="8" strokeDasharray="22 12" />
          <rect x="450" y="384" width="140" height="46" rx="23" fill={C.verm} stroke={C.ink} strokeWidth="4" />
          <T x={520} y={415} size={22} fill={C.ink} font="mono" spacing={2}>
            PICKED
          </T>
        </g>
      )}
    </Room>
  );
}

function Helix() {
  const a: string[] = [];
  const b: string[] = [];
  const rungs: ReactNode[] = [];
  for (let i = 0; i <= 40; i++) {
    const x = 600 + i * 10;
    const y1 = 230 + Math.sin(i / 4) * 52;
    const y2 = 230 - Math.sin(i / 4) * 52;
    a.push(`${i ? "L" : "M"}${x} ${y1.toFixed(1)}`);
    b.push(`${i ? "L" : "M"}${x} ${y2.toFixed(1)}`);
    if (i % 3 === 0) rungs.push(<line key={i} x1={x} x2={x} y1={y1} y2={y2} stroke={C.ink} strokeWidth="4" />);
  }
  return (
    <g>
      {rungs}
      <path d={a.join(" ")} fill="none" stroke={C.verm} strokeWidth="9" strokeLinecap="round" />
      <path d={b.join(" ")} fill="none" stroke={C.cobalt} strokeWidth="9" strokeLinecap="round" />
    </g>
  );
}

function Board({ x, y, w, h, fill = C.paper2 }: { x: number; y: number; w: number; h: number; fill?: string }) {
  return (
    <>
      <rect x={x + 8} y={y + 8} width={w} height={h} rx="18" fill={C.ink} />
      <rect x={x} y={y} width={w} height={h} rx="18" fill={fill} {...K} />
    </>
  );
}

// Survivors' hit map: holes on wings, body and tail; none on engines or cockpit (that's the point).
const HOLES = [
  [345, -44], [382, -36], [412, -50], [362, -26], [398, -24], [72, -58], [98, -36], [212, -48], [238, -28],
  [-332, -40], [-366, -52], [-402, -34], [-424, -48], [-84, -50], [-112, -30], [-214, -34], [-244, -54],
  [-14, 24], [14, 52], [-10, 92], [12, 128], [-16, 160],
  [92, 194], [124, 202], [-84, 192], [-118, 204],
];
const ENGINES = [150, 290, -150, -290];

/** 1-bullets: top-down bomber on a blueprint board, nose up. Local origin = plane center. */
function Bomber() {
  const wing = "M36 -96 L438 -64 Q452 -61 450 -48 L446 -28 Q444 -18 432 -18 L36 -14 Z";
  const stab = "M28 172 L150 186 Q160 188 158 198 L154 214 Q152 220 144 220 L28 214 Z";
  return (
    <g>
      <defs>
        <pattern id="gte-blueprint" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="2" />
        </pattern>
      </defs>
      <rect x="328" y="44" width="960" height="520" rx="22" fill={C.ink} />
      <rect x="320" y="36" width="960" height="520" rx="22" fill="#1E3399" {...K} />
      <rect x="320" y="36" width="960" height="520" rx="22" fill="url(#gte-blueprint)" />
      <T x={480} y={82} size={22} fill={C.mari} font="mono" spacing={3}>
        HIT MAP · RETURNED
      </T>
      <g transform="translate(800 312) scale(0.92)">
        <path d={wing} fill={C.paper2} {...K} />
        <path d={wing} transform="scale(-1 1)" fill={C.paper2} {...K} />
        <path d={stab} fill={C.paper2} {...K} />
        <path d={stab} transform="scale(-1 1)" fill={C.paper2} {...K} />
        {ENGINES.map((x) => (
          <g key={x}>
            <rect x={x - 22} y="-128" width="44" height="150" rx="18" fill="#CFC6B6" {...K} />
            <rect x={x - 54} y="-144" width="108" height="10" rx="5" fill={C.ink} />
            <circle cx={x} cy="-136" r="11" fill={C.mari} stroke={C.ink} strokeWidth="4" />
          </g>
        ))}
        <path d="M0 -252 C30 -252 42 -204 42 -142 L37 150 C35 202 18 232 0 238 C-18 232 -35 202 -37 150 L-42 -142 C-42 -204 -30 -252 0 -252 Z" fill={C.paper2} {...K} />
        <path d="M0 -248 C20 -248 30 -228 33 -206 L-33 -206 C-30 -228 -20 -248 0 -248 Z" fill={C.cobaltLight} stroke={C.ink} strokeWidth="4" strokeLinejoin="round" />
        <rect x="-24" y="-190" width="20" height="22" rx="5" fill={C.cobalt} stroke={C.ink} strokeWidth="3.5" />
        <rect x="4" y="-190" width="20" height="22" rx="5" fill={C.cobalt} stroke={C.ink} strokeWidth="3.5" />
        <rect x="-6" y="150" width="12" height="92" rx="6" fill={C.ink} />
        {[-110, 60, 110].map((y) => (
          <path key={y} d={`M-38 ${y} H38`} stroke={C.ink} strokeWidth="3" opacity="0.35" />
        ))}
        {[-372, 372].map((x) => (
          <g key={x}>
            <circle cx={x} cy="-40" r="16" fill={C.cobalt} stroke={C.ink} strokeWidth="3" />
            <circle cx={x} cy="-40" r="6" fill={C.paper2} />
          </g>
        ))}
        {HOLES.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="8.5" fill={C.verm} stroke={C.ink} strokeWidth="3" />
        ))}
      </g>
    </g>
  );
}

const SCENES: Record<Exclude<SceneId, "gameshow">, ReactNode> = {
  lab: (
    <Room wall="#1E9C93">
      {[0, 1].map((r) => (
        <g key={r}>
          <rect x="70" y={110 + r * 150} width="330" height="16" fill={C.paper2} {...K} />
          {[0, 1, 2, 3].map((j) => (
            <rect key={j} x={100 + j * 72} y={56 + r * 150} width="42" height="54" rx="8" fill={[C.mari, C.verm, C.paper2, "#B58CFF"][(j + r) % 4]} {...K} />
          ))}
        </g>
      ))}
      <rect x="760" y="430" width="80" height="180" fill="#2A2933" {...K} />
      <rect x="520" y="70" width="560" height="380" rx="26" fill={C.ink} />
      <rect x="544" y="92" width="512" height="336" rx="14" fill={C.paper2} {...K} />
      <Helix />
      <rect x="590" y="334" width="420" height="64" rx="12" fill={C.verm} {...K} />
      <T x={800} y={378} size={32} fill={C.ink} font="mono">
        MATCH · 1 in 1,000,000
      </T>
      <rect x="1100" y="560" width="440" height="24" fill={C.paper2} {...K} />
      <rect x="1120" y="584" width="400" height="136" fill="#2A2933" {...K} />
      {[1140, 1210, 1280].map((x, i) => (
        <path key={x} d={`M${x} 470 h34 v40 l14 50 h-62 l14 -50 z`} fill={[C.mari, "#FF7FB8", C.paper2][i]} {...K} />
      ))}
    </Room>
  ),
  hospital: (
    <Room wall={C.cobaltLight}>
      <path d="M760 60 h40 v-40 h40 v40 h40 v40 h-40 v40 h-40 v-40 h-40 Z" fill={C.verm} {...K} />
      <Board x={540} y={200} w={520} h={270} />
      <T x={800} y={280} size={48} fill={C.ink} font="mono">
        SURGEON A · 95%
      </T>
      <T x={800} y={360} size={48} fill={C.ink} font="mono">
        SURGEON B · 90%
      </T>
      <T x={800} y={432} size={32} fill={C.muted} font="serif">
        overall success
      </T>
      <rect x="1120" y="110" width="330" height="250" rx="10" fill="#CFE8FF" stroke={C.paper2} strokeWidth="16" />
      <rect x="1112" y="102" width="346" height="266" rx="14" fill="none" {...K} />
      <line x1="1285" x2="1285" y1="110" y2="360" stroke={C.paper2} strokeWidth="12" />
      <rect x="120" y="140" width="250" height="190" rx="12" fill={C.paper2} {...K} />
      <path d="M140 250 h40 l20 -50 l25 90 l20 -40 h125" fill="none" stroke={C.verm} strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="1050" y="560" width="440" height="70" rx="16" fill={C.paper2} {...K} />
      <rect x="1050" y="618" width="440" height="34" fill="#CFC6B6" {...K} />
      <rect x="1068" y="652" width="16" height="68" fill={C.ink} />
      <rect x="1456" y="652" width="16" height="68" fill={C.ink} />
    </Room>
  ),
  classroom: (
    <Room wall={C.mari} dots={0.22}>
      <rect x="290" y="40" width="1020" height="310" rx="16" fill="#9A4A1E" {...K} />
      <rect x="310" y="60" width="980" height="270" rx="8" fill="#1F4D3A" {...K} />
      <T x={800} y={175} size={88} fill={C.paper} font="serif">
        target = ⅔ × average
      </T>
      <T x={800} y={272} size={46} fill={C.mari} font="mono">
        pick 0 … 100
      </T>
      {[110, 1310].map((x) => (
        <g key={x}>
          <rect x={x} y="590" width="180" height="22" fill="#9A4A1E" {...K} />
          <rect x={x + 12} y="612" width="16" height="108" fill={C.ink} />
          <rect x={x + 152} y="612" width="16" height="108" fill={C.ink} />
        </g>
      ))}
    </Room>
  ),
  arena: (
    <Room wall={C.verm}>
      <rect x="800" width="800" height={FLOOR} fill={C.cobalt} />
      <rect x="800" width="800" height={FLOOR} fill="url(#gte-dots-scene)" />
      <line x1="800" x2="800" y1="0" y2={FLOOR} stroke={C.ink} strokeWidth="6" />
      <Board x={560} y={50} w={480} h={230} />
      <T x={800} y={104} size={40} fill={C.ink}>
        COOPERATE
      </T>
      <T x={800} y={148} size={30} fill={C.ink} font="mono">
        3 / 3 · 0 / 5
      </T>
      <T x={800} y={212} size={40} fill={C.ink}>
        DEFECT
      </T>
      <T x={800} y={256} size={30} fill={C.ink} font="mono">
        5 / 0 · 1 / 1
      </T>
      {[330, 1050].map((x) => (
        <g key={x}>
          <rect x={x} y="560" width="220" height="160" rx="14" fill={C.paper2} {...K} />
          <circle cx={x + 70} cy="556" r="30" fill="#34C77B" {...K} />
          <circle cx={x + 150} cy="556" r="30" fill={C.verm} {...K} />
          <T x={x + 110} y={660} size={24} fill={C.ink} font="mono">
            C · D
          </T>
        </g>
      ))}
    </Room>
  ),
  courtroom: (
    <Room wall="#C0703A">
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x={i * 200 + 24} y="40" width="152" height="600" rx="8" fill="#A85E2E" stroke={C.ink} strokeWidth="3" />
      ))}
      <circle cx="800" cy="138" r="92" fill={C.mari} {...K} />
      <path d="M800 78 v120 M740 110 h120 M740 110 l-25 50 h50 Z M860 110 l-25 50 h50 Z M770 200 h60" stroke={C.ink} strokeWidth="6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="540" y="370" width="520" height="350" rx="10" fill="#7A3E1A" {...K} />
      <rect x="520" y="350" width="560" height="40" rx="8" fill="#A85E2E" {...K} />
      <rect x="700" y="460" width="200" height="70" rx="10" fill={C.mari} {...K} />
      <T x={800} y={506} size={30} fill={C.ink} font="mono">
        ORDER
      </T>
      <rect x="80" y="600" width="360" height="120" fill="#7A3E1A" {...K} />
      <rect x="1160" y="600" width="360" height="120" fill="#7A3E1A" {...K} />
    </Room>
  ),
  airfield: (
    <Room wall="#9CC9FF" dots={0.25}>
      <circle cx="1420" cy="130" r="70" fill={C.mari} {...K} />
      {[
        [50, 70, 0.9],
        [1330, 290, 0.8],
      ].map(([x, y, s]) => (
        <path
          key={x}
          transform={`translate(${x} ${y}) scale(${s})`}
          d="M0 40 a40 40 0 0 1 70 -26 a50 50 0 0 1 90 10 a34 34 0 0 1 10 66 h-150 a30 30 0 0 1 -20 -50z"
          fill={C.paper2}
          {...K}
        />
      ))}
      <Bomber />
    </Room>
  ),
  hall: (
    <Room wall="#8F86F0">
      <polygon points="150,0 230,0 420,720 -60,720" fill="#FFF3CF" opacity="0.1" />
      <polygon points="1370,0 1450,0 1660,720 1180,720" fill="#FFF3CF" opacity="0.1" />
      <rect x="408" y="78" width="800" height="400" rx="22" fill={C.ink} />
      <rect x="400" y="70" width="800" height="400" rx="22" fill={C.ink} stroke={C.mari} strokeWidth="6" />
      <T x={800} y={138} size={44} fill={C.mari} font="mono" spacing={4}>
        LEADERBOARD
      </T>
      {[600, 470, 360, 250].map((w, i) => (
        <rect key={i} x="470" y={176 + i * 68} width={w} height="46" rx="10" fill={["#FF6B4A", "#6C8CFF", "#34C77B", "#FFC531"][i]} stroke={C.paper} strokeWidth="3" />
      ))}
    </Room>
  ),
};

export function Scene({ id, step = 0 }: { id: SceneId; step?: number }) {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} aria-hidden="true">
      {id === "gameshow" ? <GameShow step={step} /> : SCENES[id]}
    </svg>
  );
}
