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
  dialogue: Line[];
  summary: string[];
  prompt: string;
  kind: "mcq" | "number";
  choices: string[];
  lockChoice?: boolean; // 1C: pick is locked before the twist is shown
  extra?: "matrix";
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
    dialogue: [
      { who: "maya", text: "Welcome back to Pick-a-Door! Three doors. Behind one: a brand-new car. Behind the other two: nothing at all.", pose: "wave" },
      { who: "omar", text: "I've been practicing my lucky guesses for weeks.", pose: "cheer" },
      { who: "maya", text: "Choose a door. Any door.", pose: "point" },
      { who: "omar", text: "Door number 1!", pose: "point" },
      { who: "maya", text: "Now, I know where the car is. So I'll open one of the OTHER doors, one I know is empty.", pose: "idle" },
      { who: "narrator", text: "Door 3 swings open. Empty." },
      { who: "maya", text: "Two doors left: your Door 1, and Door 2. So… do you stay, or switch to Door 2?", pose: "shrug" },
      { who: "omar", text: "Two doors means fifty-fifty… right? Then why is she even asking?", pose: "think" },
      { who: "maya", text: "Teams, help him out. Stay or switch?", pose: "point" },
    ],
    summary: [
      "A car is behind 1 of 3 doors; the other 2 are empty.",
      "The contestant picks Door 1.",
      "The host, who knows where the car is, always opens an empty door (Door 3) and offers a switch.",
    ],
    prompt: "Should the contestant stay or switch?",
    kind: "mcq",
    choices: ["Stay with Door 1", "Switch to Door 2", "Doesn't matter, it's 50/50"],
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
      { who: "karim", text: "We ran the crime-scene DNA through the database. We got a hit.", pose: "point" },
      { who: "lina", text: "The suspect matches. The chance an innocent person matches by coincidence is 1 in a million.", pose: "idle" },
      { who: "karim", text: "One in a million! Case closed. He's 99.9999% guilty.", pose: "cheer" },
      { who: "lina", text: "Hold on. How many people live in this city?", pose: "think" },
      { who: "karim", text: "About 8 million. Why?", pose: "shrug" },
      { who: "lina", text: "And how did we find him? Any other evidence pointing at him?", pose: "think" },
      { who: "karim", text: "Not really. He just popped up in the database search.", pose: "shrug" },
      { who: "lina", text: "Then before we celebrate, let's think about what that match actually tells us.", pose: "point" },
    ],
    summary: [
      "Crime-scene DNA matches a suspect.",
      "Chance an innocent person matches by coincidence: 1 in 1,000,000.",
      "City population: 8,000,000. The suspect was found only by the database search, no other evidence.",
    ],
    prompt: "Is the suspect almost certainly guilty?",
    kind: "mcq",
    choices: [
      "Yes: 1-in-a-million means ~99.9999% guilty",
      "Yes: at least ~90% likely guilty",
      "No: on its own it's only about a 1-in-9 chance",
      "No: DNA evidence is never reliable",
    ],
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
      { who: "sara", text: "I need surgery next week, and I get to pick my surgeon.", pose: "idle" },
      { who: "hadi", text: "You have two options. Here are their records.", pose: "point" },
      { who: "narrator", text: "Surgeon A: 95% overall success. Surgeon B: 90% overall success." },
      { who: "sara", text: "Well… 95 beats 90. That seems easy.", pose: "think" },
      { who: "hadi", text: "Before you decide: Surgeon B takes most of this hospital's severe cases.", pose: "idle" },
      { who: "sara", text: "Does that matter? A success rate is a success rate.", pose: "shrug" },
      { who: "hadi", text: "Pick first. Then I'll show you the full breakdown.", pose: "point" },
    ],
    summary: ["Surgeon A: 95% overall success rate.", "Surgeon B: 90% overall success rate.", "You must choose one."],
    prompt: "Which surgeon would you choose?",
    kind: "mcq",
    choices: ["Surgeon A (95%)", "Surgeon B (90%)", "No real difference"],
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
      { who: "nadia", text: "Pop quiz. And it's not about facts, it's about each other.", pose: "wave" },
      { who: "nadia", text: "Every team secretly picks a whole number from 0 to 100.", pose: "point" },
      { who: "nadia", text: "We average all the numbers, then take two-thirds of that. That's the target. Closest wins.", pose: "idle" },
      { who: "yousef", text: "If everyone picks randomly, the average is 50, so the target is about 33.", pose: "think" },
      { who: "leen", text: "But if everyone thinks that, they'll all pick 33… so the target becomes 22.", pose: "point" },
      { who: "yousef", text: "And if they think THAT far ahead…", pose: "shrug" },
      { who: "nadia", text: "Exactly. How deep does your reasoning go? Choose your number.", pose: "point" },
    ],
    summary: [
      "Each team picks a whole number from 0 to 100.",
      "Target = ⅔ × the average of all submitted numbers.",
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
      { who: "rami", text: "Two teams. Two buttons: COOPERATE or DEFECT. No talking, no peeking.", pose: "wave" },
      { who: "rami", text: "Both cooperate? 3 points each. Both defect? 1 point each.", pose: "point" },
      { who: "rami", text: "But if one defects while the other cooperates, the defector gets 5 and the cooperator gets nothing.", pose: "shrug" },
      { who: "dana", text: "If they cooperate, I get 3 by cooperating… or 5 by defecting.", pose: "think" },
      { who: "zaid", text: "And if they defect, I get 0 by cooperating… or 1 by defecting.", pose: "think" },
      { who: "dana", text: "So no matter what they do…", pose: "shrug" },
      { who: "zaid", text: "…but if we BOTH think like that, we each walk away with 1 instead of 3.", pose: "point" },
      { who: "rami", text: "One round only. Choose wisely.", pose: "idle" },
    ],
    summary: [
      "Two teams each secretly choose COOPERATE or DEFECT.",
      "Points come from the payoff matrix below.",
      "This is a single round.",
    ],
    prompt: "To maximize your own points in this single round, what should a team choose?",
    kind: "mcq",
    choices: ["Cooperate", "Defect", "It depends on what the other team picks"],
    extra: "matrix",
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
      { who: "amal", text: "Before deliberations, the jury has a question for the court.", pose: "idle" },
      { who: "huda", text: "Your Honor, how sure do we need to be before we convict?", pose: "think" },
      { who: "faris", text: "Every justice system makes two kinds of mistakes: freeing a guilty person, or convicting an innocent one.", pose: "point" },
      { who: "faris", text: "Lower the bar and you catch more criminals, but you also convict more innocent people.", pose: "shrug" },
      { who: "amal", text: "There's an old principle: better that ten guilty people go free than one innocent person suffer.", pose: "idle" },
      { who: "huda", text: "So convicting an innocent person is ten times worse than freeing a guilty one?", pose: "think" },
      { who: "amal", text: "If society believes that, then the math can tell you exactly how sure you need to be.", pose: "point" },
    ],
    summary: [
      "Two possible errors: freeing a guilty person, or convicting an innocent one.",
      "Assume society judges a wrongful conviction to be 10× worse than freeing a guilty person.",
    ],
    prompt: "To minimize expected harm, convict only when the probability of guilt is above…",
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
      { who: "tariq", text: "Our planes keep coming back shot up. We need more armor, but armor is heavy.", pose: "point" },
      { who: "rana", text: "So we can only reinforce some parts of the plane. Which ones?", pose: "think" },
      { who: "tariq", text: "Look at this. We mapped every bullet hole on the planes that returned.", pose: "point" },
      { who: "narrator", text: "Wings and tail: covered in holes. Engines and cockpit: almost untouched." },
      { who: "tariq", text: "Obvious, right? Armor the wings and tail. That's where they're getting hit.", pose: "cheer" },
      { who: "rana", text: "Hmm. Which planes did we actually look at?", pose: "think" },
      { who: "tariq", text: "The ones that came back, of course.", pose: "shrug" },
    ],
    summary: [
      "On returning planes, bullet holes cluster on the wings and tail.",
      "Engines and cockpit have very few holes.",
      "Armor is limited; only some areas can be reinforced.",
    ],
    prompt: "Where should the armor go?",
    kind: "mcq",
    choices: [
      "Where there are the most holes (wings, tail)",
      "Where there are the fewest holes (engines, cockpit)",
      "Spread equally across the plane",
      "No extra armor is needed",
    ],
  },
  {
    id: "voting",
    code: "∞",
    title: "The Voting Game",
    topic: "Game Theory of This Event",
    scene: "hall",
    cast: {
      reem: { name: "Reem", skin: SKIN[2], hair: "#3b0764", hairStyle: "long", top: "#7c3aed", bottom: "#1f2937" },
      host: { name: "The Host", skin: SKIN[1], hair: "#111827", hairStyle: "short", top: "#facc15", bottom: "#111827", accessory: "mic" },
      ali: { name: "Ali", skin: SKIN[3], hair: "#1c1917", hairStyle: "curly", top: "#0d9488", bottom: "#334155" },
    },
    dialogue: [
      { who: "host", text: "One last question. And this time, the game… is this event itself.", pose: "wave" },
      { who: "host", text: "Every round, your team earned 2 points for a correct answer, plus the average vote other teams gave you.", pose: "point" },
      { who: "reem", text: "And we voted on every other team… but never on ourselves.", pose: "think" },
      { who: "ali", text: "So my vote could never raise my own score.", pose: "shrug" },
      { who: "reem", text: "But it could raise or lower everyone we're competing against…", pose: "point" },
      { who: "host", text: "So tell me: if all you cared about was your team's rank, how should you have voted?", pose: "point" },
    ],
    summary: [
      "Score per question = 2 (if correct) + average of the other teams' votes.",
      "Your vote never affects your own score, only your rivals' scores.",
    ],
    prompt: "To maximize your team's rank, how should a team vote on the other teams?",
    kind: "mcq",
    choices: ["Honestly", "Always 10", "Always 0", "Randomly"],
    last: true,
  },
];

export const questionById = (id: string | null | undefined) => QUESTIONS.find((q) => q.id === id);

export const RULES = [
  "Each team submits ONE answer plus a written explanation per question. Any member can submit; the latest submission counts.",
  "You have 5 minutes to answer.",
  "Teams are then picked at random to present: you get 60 seconds to explain your answer out loud.",
  "After each presentation, every other team gives ONE vote from 0 to 10.",
  "Points per question = 2 for a correct answer + the average vote you received.",
  "Points add up across all questions. Highest total wins!",
];

export const TEAM_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];
