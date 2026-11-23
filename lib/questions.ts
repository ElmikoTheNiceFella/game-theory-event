import { TOKENS } from "./theme.ts";

// Public question content (safe to ship to phones). Answer key lives in lib/answers.ts (server-only).

export type Pose = "idle" | "point" | "think" | "shrug" | "cheer" | "wave";
export type HairStyle = "short" | "long" | "bun" | "curly" | "bald" | "hijab";
export type Accessory = "none" | "tie" | "labcoat" | "robe" | "mic" | "cap";
export type SceneId = "gameshow" | "lab" | "hospital" | "classroom" | "arena" | "courtroom" | "airfield" | "hall";

export type Look = {
  name: string;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string;
  bottom: string;
  accessory?: Accessory;
};

export type Line = { who: string; text: string; pose?: Pose }; // who = cast key or "narrator"

export type Question = {
  id: string;
  code: string;
  title: string;
  topic: string;
  scene: SceneId;
  cast: Record<string, Look>;
  dialogue: Line[]; // max 4 cards (narrator lines count), see questions.test.ts
  summary: string[];
  prompt: string;
  kind: "mcq" | "number" | "pd"; // pd = 2B head-to-head matches instead of answer/present/vote
  choices: string[];
  lockChoice?: boolean; // 1C: pick is locked before the twist is shown
  last?: boolean;
};

const SKIN = ["#f1c7a5", "#d9a27c", "#b97b56", "#8d5a3b", "#5e3a24"];

export const QUESTIONS: Question[] = [
  {
    id: "1a",
    code: "1A",
    title: "The Three Doors",
    topic: "Counterintuitive Probability",
    scene: "gameshow",
    cast: {
      maya: { name: "Maya", skin: SKIN[1], hair: "#2b1b14", hairStyle: "long", top: "#e11d48", bottom: "#1f2937", accessory: "mic" },
      omar: { name: "Omar", skin: SKIN[2], hair: "#111827", hairStyle: "short", top: "#2563eb", bottom: "#374151" },
    },
    // Scene.tsx GameShow keys off these indices: 1 = Door 1 picked, 2 = Door 3 opens.
    dialogue: [
      { who: "maya", text: "Welcome to Pick-a-Door! One door hides a brand-new car. The other two hide nothing. Pick one!", pose: "wave" },
      { who: "omar", text: "Door number 1!", pose: "point" },
      { who: "maya", text: "I know where the car is, so I'll open a door I know is empty: Door 3.", pose: "point" },
      { who: "omar", text: "Two doors left, so it's 50/50… right? Should I stay or switch?", pose: "think" },
    ],
    summary: [
      "A car is behind 1 of 3 doors. The other 2 are empty.",
      "The contestant picks Door 1.",
      "The host knows where the car is. He always opens an empty door the contestant didn't pick (here, Door 3), then offers a switch.",
    ],
    prompt: "Should the contestant stay with Door 1 or switch to Door 2?",
    kind: "mcq",
    choices: ["Stay with Door 1", "Switch to Door 2", "It doesn't matter: it's 50/50"],
  },
  {
    id: "1b",
    code: "1B",
    title: "The DNA Evidence",
    topic: "Counterintuitive Probability",
    scene: "lab",
    cast: {
      karim: { name: "Det. Karim", skin: SKIN[3], hair: "#1c1917", hairStyle: "short", top: "#78350f", bottom: "#292524", accessory: "tie" },
      lina: { name: "Lina", skin: SKIN[0], hair: "#7c2d12", hairStyle: "bun", top: "#0f766e", bottom: "#334155", accessory: "labcoat" },
    },
    dialogue: [
      { who: "karim", text: "The crime-scene DNA matches a man in our database. An innocent person matches only 1 time in a million!", pose: "cheer" },
      { who: "karim", text: "So he's 99.9999% guilty. Case closed.", pose: "point" },
      { who: "lina", text: "Not so fast. The culprit is one of the 8 million people in this city, and we have no other evidence against this man.", pose: "think" },
      { who: "lina", text: "So how likely is it that he's really the culprit?", pose: "point" },
    ],
    summary: [
      "Crime-scene DNA matches a suspect.",
      "An innocent person matches by pure chance 1 time in 1,000,000.",
      "The culprit is one of the city's 8,000,000 people.",
      "There is no other evidence against the suspect.",
    ],
    prompt: "Based on the DNA alone, how likely is the suspect to be guilty?",
    kind: "mcq",
    choices: ["About 99.9999%: it's a 1-in-a-million match", "At least 90%", "About 1 in 9 (≈ 11%)", "Close to 0%: DNA matches prove nothing"],
  },
  {
    id: "1c",
    code: "1C",
    title: "Choosing the Better Surgeon",
    topic: "Counterintuitive Probability",
    scene: "hospital",
    cast: {
      sara: { name: "Sara", skin: SKIN[1], hair: "#4338ca", hairStyle: "hijab", top: "#a855f7", bottom: "#1e293b" },
      hadi: { name: "Nurse Hadi", skin: SKIN[4], hair: "#0c0a09", hairStyle: "bald", top: "#06b6d4", bottom: "#06b6d4", accessory: "cap" },
    },
    dialogue: [
      { who: "hadi", text: "You can choose your surgeon. Surgeon A's operations succeed 95% of the time. Surgeon B's succeed 90% of the time.", pose: "point" },
      { who: "sara", text: "95 beats 90. Easy: Surgeon A!", pose: "cheer" },
      { who: "hadi", text: "One detail: Surgeon B takes most of the hospital's severe, high-risk cases.", pose: "idle" },
      { who: "hadi", text: "Lock in your pick first. Then I'll show you both records, split into mild and severe cases.", pose: "point" },
    ],
    summary: [
      "Surgeon A: 95% of operations succeed.",
      "Surgeon B: 90% of operations succeed.",
      "Surgeon B handles most of the severe (riskier) cases.",
      "Lock in a pick first. Then you'll see the full records.",
    ],
    prompt: "Which surgeon should you choose?",
    kind: "mcq",
    choices: ["Surgeon A (95% overall)", "Surgeon B (90% overall)", "It makes no difference"],
    lockChoice: true,
  },
  {
    id: "2a",
    code: "2A",
    title: "The Two-Thirds Game",
    topic: "Strategic Decision-Making",
    scene: "classroom",
    cast: {
      yousef: { name: "Yousef", skin: SKIN[2], hair: "#1f1300", hairStyle: "curly", top: "#16a34a", bottom: "#1f2937" },
      nadia: { name: "Prof. Nadia", skin: SKIN[0], hair: "#111827", hairStyle: "bun", top: "#475569", bottom: "#0f172a", accessory: "tie" },
      leen: { name: "Leen", skin: SKIN[3], hair: "#4a2511", hairStyle: "long", top: "#f59e0b", bottom: "#334155" },
    },
    dialogue: [
      { who: "nadia", text: "Every team secretly picks a whole number from 0 to 100.", pose: "point" },
      { who: "nadia", text: "I'll average all the picks and take two-thirds of that. That's the target. The closest team wins.", pose: "idle" },
      { who: "yousef", text: "If people pick at random, the average is 50, so the target is about 33.", pose: "think" },
      { who: "leen", text: "But if everyone picks 33, the target drops to 22… and then lower. How far ahead should we think?", pose: "shrug" },
    ],
    summary: [
      "Each team secretly picks a whole number from 0 to 100.",
      "Target = ⅔ × the average of all picks.",
      "The team closest to the target wins.",
    ],
    prompt: "What number does your team pick?",
    kind: "number",
    choices: [],
  },
  {
    id: "2b",
    code: "2B",
    title: "Cooperate or Defect",
    topic: "Strategic Decision-Making",
    scene: "arena",
    cast: {
      dana: { name: "Dana", skin: SKIN[1], hair: "#7f1d1d", hairStyle: "long", top: "#dc2626", bottom: "#1f2937" },
      rami: { name: "Rami", skin: SKIN[2], hair: "#0f172a", hairStyle: "short", top: "#facc15", bottom: "#374151", accessory: "mic" },
      zaid: { name: "Zaid", skin: SKIN[3], hair: "#1e1b4b", hairStyle: "short", top: "#2563eb", bottom: "#1f2937" },
    },
    dialogue: [
      { who: "rami", text: "Every team faces one other team. Each round, both teams secretly press COOPERATE or DEFECT.", pose: "wave" },
      { who: "rami", text: "Both cooperate: 3 points each. Both defect: 1 point each. One defects, one cooperates: the defector gets 5, the cooperator gets 0.", pose: "point" },
      { who: "dana", text: "So in any single round, defecting pays more…", pose: "think" },
      { who: "zaid", text: "…but if we both defect every round, we each get 1 instead of 3. And every point goes on the leaderboard.", pose: "point" },
    ],
    summary: [
      "Your team plays 4 rounds against one other team.",
      "Each round, both teams secretly choose COOPERATE or DEFECT.",
      "Points follow the table. Your match total is added to the leaderboard.",
    ],
    prompt: "Cooperate or defect?",
    kind: "pd",
    choices: ["Cooperate", "Defect"],
  },
  {
    id: "3a",
    code: "3A",
    title: "Justice vs. Wrongful Conviction",
    topic: "Ethics and Society",
    scene: "courtroom",
    cast: {
      faris: { name: "Faris", skin: SKIN[2], hair: "#18181b", hairStyle: "short", top: "#1e3a8a", bottom: "#1e293b", accessory: "tie" },
      amal: { name: "Judge Amal", skin: SKIN[1], hair: "#d4d4d8", hairStyle: "bun", top: "#0a0a0a", bottom: "#0a0a0a", accessory: "robe" },
      huda: { name: "Huda (juror)", skin: SKIN[4], hair: "#0c0a09", hairStyle: "curly", top: "#be185d", bottom: "#334155" },
    },
    dialogue: [
      { who: "huda", text: "Your Honor, how sure must we be before we convict?", pose: "think" },
      { who: "amal", text: "Every verdict risks one of two mistakes: freeing a guilty person, or convicting an innocent one.", pose: "idle" },
      { who: "faris", text: "An old principle says it's better that 10 guilty people go free than that 1 innocent person is convicted.", pose: "point" },
      { who: "amal", text: "If convicting an innocent person is 10 times worse, the math tells you exactly how sure you need to be.", pose: "point" },
    ],
    summary: [
      "A verdict can go wrong in two ways: freeing a guilty person, or convicting an innocent one.",
      "Assume convicting an innocent person is 10× as harmful as freeing a guilty one.",
    ],
    prompt: "To keep the expected harm as low as possible, convict only when the chance of guilt is above…",
    kind: "mcq",
    choices: ["50%", "75%", "About 91%", "99.9%"],
  },
  {
    id: "bullets",
    code: "★",
    title: "The Missing Bullet Holes",
    topic: "Survivorship Bias",
    scene: "airfield",
    cast: {
      tariq: { name: "Capt. Tariq", skin: SKIN[3], hair: "#1c1917", hairStyle: "short", top: "#4d7c0f", bottom: "#3f6212", accessory: "cap" },
      rana: { name: "Eng. Rana", skin: SKIN[0], hair: "#64748b", hairStyle: "hijab", top: "#0369a1", bottom: "#1e293b", accessory: "labcoat" },
    },
    dialogue: [
      { who: "tariq", text: "Our planes keep coming back full of bullet holes. We can add armor, but only to some areas.", pose: "point" },
      { who: "narrator", text: "On the planes that came back, holes cover the wings, tail and body. The engines and cockpit are almost clean." },
      { who: "tariq", text: "Easy: armor the wings and tail. That's where they get hit!", pose: "cheer" },
      { who: "rana", text: "Wait. We only looked at the planes that made it back…", pose: "think" },
    ],
    summary: [
      "On planes that returned, bullet holes cluster on the wings, tail and body.",
      "The engines and cockpit have almost no holes.",
      "Armor is heavy: only some areas can be reinforced.",
    ],
    prompt: "Where should the armor go?",
    kind: "mcq",
    choices: [
      "Where the most holes are (wings, tail)",
      "Where the fewest holes are (engines, cockpit)",
      "Spread evenly over the whole plane",
      "Nowhere: the planes made it back fine",
    ],
  },
  {
    id: "voting",
    code: "∞",
    title: "???", // kept secret until it is played
    topic: "???",
    scene: "hall",
    cast: {
      reem: { name: "Reem", skin: SKIN[2], hair: "#3b0764", hairStyle: "long", top: "#7c3aed", bottom: "#1f2937" },
      host: { name: "The Host", skin: SKIN[1], hair: "#111827", hairStyle: "short", top: "#facc15", bottom: "#111827", accessory: "mic" },
      ali: { name: "Ali", skin: SKIN[3], hair: "#1c1917", hairStyle: "curly", top: "#0d9488", bottom: "#334155" },
    },
    dialogue: [
      { who: "host", text: "Last question. This time, the game is this event itself.", pose: "wave" },
      { who: "host", text: "On most questions, you earned 2 points for a correct answer, plus the average vote the other teams gave you.", pose: "point" },
      { who: "reem", text: "We voted on every other team, but never on ourselves. So our vote never changed our own score…", pose: "think" },
      { who: "ali", text: "…only our rivals' scores. So how should we have voted?", pose: "shrug" },
    ],
    summary: [
      "On most questions: points = 2 (if correct) + the average vote from the other teams.",
      "Your vote never changes your own score, only your rivals' scores.",
    ],
    prompt: "If you only care about your team's rank, how should you vote on the other teams?",
    kind: "mcq",
    choices: ["Honestly", "Always 10", "Always 0", "Randomly"],
    last: true,
  },
];

export const questionById = (id: string | null | undefined) => QUESTIONS.find((q) => q.id === id);

export const RULES = [
  "Each team submits one answer plus a written explanation. Any teammate can submit; the latest submission counts.",
  "You have 5 minutes to answer.",
  "Then teams are picked at random to present: you get 60 seconds to explain your answer out loud.",
  "After each presentation, every other team votes once, from 0 to 10.",
  "Points per question = 2 for a correct answer + the average vote you received.",
  "Points add up across all questions. Highest total wins!",
];

export const TEAM_COLORS = TOKENS.map((t) => t.color);
