import "server-only";
import { SURGEON_TABLE } from "./surgeonTable";

export type AnswerKey = { correct: number[]; answer: string; insight: string };

// correct = 0-based choice indices. 2A is scored specially (0 or closest), see scoring.ts.
export const ANSWERS: Record<string, AnswerKey> = {
  "1a": {
    correct: [1],
    answer: "Switch! Switching wins 2/3 of the time.",
    insight:
      "Your first pick wins 1/3 of the time, and nothing the host does changes that. The host never opens a random door: he always avoids the car. So the remaining 2/3 lands entirely on the other closed door.",
  },
  "1b": {
    correct: [2],
    answer: "No. Alone, the match implies only about a 1-in-9 chance of guilt.",
    insight:
      "8,000,000 × 1/1,000,000 ≈ 8 innocent people would also match, plus the real culprit: about 9 matches. With no other evidence, the chance this match is the culprit is ~11%. Confusing P(match | innocent) with P(innocent | match) is the prosecutor's fallacy. You need other evidence, how he was identified, and whether the culprit is even in the city.",
  },
  "1c": {
    correct: [1],
    answer: "Surgeon B, who is better at BOTH mild and severe cases.",
    insight:
      "Simpson's paradox. Surgeon B handles mostly severe cases, which have lower success rates for everyone. Compare within each category and B wins both. Aggregating the data hides the patient mix.",
  },
  "2a": {
    correct: [0],
    answer: "0 (Nash equilibrium). Closest to the actual target also scores.",
    insight:
      "If everyone is rational and knows everyone is rational, each round of 'they'll pick ⅔ of that' pushes the guess down: 33 → 22 → 15 → … → 0. The only Nash equilibrium is 0. Real groups usually land around 20–35 because people stop after 1–2 levels of reasoning.",
  },
  "2b": {
    correct: [1],
    answer: "Defect, a dominant strategy in a single round.",
    insight:
      "Whatever the other team does, defecting pays more (5 > 3 and 1 > 0). So both defect and get 1 each, worse than the 3 each from mutual cooperation. That's the prisoner's dilemma. In repeated games, strategies like tit-for-tat can sustain cooperation.",
  },
  "3a": {
    correct: [2],
    answer: "About 91% (10/11).",
    insight:
      "Convict when the expected harm of acquitting is bigger: P × 1 > (1 − P) × 10, so P > 10/11 ≈ 91%. The math gives the threshold; choosing the 10:1 ratio is the ethical part. It's a decision threshold trading false positives against false negatives.",
  },
  bullets: {
    correct: [1],
    answer: "Where there are the fewest holes: engines and cockpit.",
    insight:
      "Survivorship bias. You only see the planes that survived. Planes hit in the engine or cockpit never came back, so those holes are missing from the data. The 'clean' areas on survivors are exactly where hits are fatal.",
  },
  voting: {
    correct: [2],
    answer: "Always give 0 to every other team.",
    insight:
      "Your own score never depends on your vote, and every point you give a rival can only help them pass you. So voting 0 weakly dominates every other strategy: it's the Nash equilibrium. If every team does it, all vote averages become 0 and only correct answers matter, the collectively 'worst' outcome, just like the prisoner's dilemma. Real competitions fix this with mechanism design, such as dropping extreme votes or rewarding voters who agree with the consensus.",
  },
};

export { SURGEON_TABLE };
