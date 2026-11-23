import "server-only";
import { SURGEON_TABLE } from "./surgeonTable.ts";

/** math = step-by-step breakdown the host can reveal with a click (never shipped before the reveal). */
export type AnswerKey = { correct: number[]; answer: string; insight: string; math: string[] };

// correct = 0-based choice indices. 2A is scored specially (0 or closest), 2B by match points: see scoring.ts.
export const ANSWERS: Record<string, AnswerKey> = {
  "1a": {
    correct: [1],
    answer: "Switch! Switching wins 2 times out of 3.",
    insight:
      "Your first pick is right 1/3 of the time, and nothing the host does changes that. The host never opens a door at random: he always avoids the car. So the other 2/3 all lands on the one door he leaves closed.",
    math: [
      "P(car behind your door) = 1/3",
      "P(car behind one of the other two) = 2/3",
      "The host always opens the empty one of those two",
      "So the closed one carries the full 2/3",
      "Stay wins 1/3 · Switch wins 2/3",
    ],
  },
  "1b": {
    correct: [2],
    answer: "No. On its own, the match means only about a 1-in-9 chance of guilt.",
    insight:
      "Among 8 million people, about 8 innocent people would match by chance, plus the real culprit: about 9 matches in total. With no other evidence, this man is just one of those 9. Mixing up P(match | innocent) with P(innocent | match) is called the prosecutor's fallacy.",
    math: [
      "Innocent people: 8,000,000 − 1 ≈ 8,000,000",
      "Chance matches: 8,000,000 × 1/1,000,000 = 8",
      "The culprit always matches: 8 + 1 = 9 matches",
      "P(guilty | match) = 1/9 ≈ 11%",
    ],
  },
  "1c": {
    correct: [1],
    answer: "Surgeon B: better at BOTH mild and severe cases.",
    insight:
      "This is Simpson's paradox. Surgeon B handles mostly severe cases, which fail more often for any surgeon. Compare within each type of case and B wins both times. Adding everything together hides the patient mix.",
    math: [
      "Mild: A 880/900 = 97.8% · B 198/200 = 99.0% → B",
      "Severe: A 70/100 = 70.0% · B 702/800 = 87.8% → B",
      "Overall: A 950/1000 = 95% · B 900/1000 = 90%",
      "90% of A's patients are mild; 80% of B's are severe",
    ],
  },
  "2a": {
    correct: [0],
    answer: "0, the Nash equilibrium. The team closest to the real target also scores.",
    insight:
      "If everyone is rational and knows everyone else is too, each round of “they'll pick ⅔ of that” pushes the guess down: 33 → 22 → 15 → … → 0. The only stable answer is 0. Real groups usually land around 20–35 because people stop after 1 or 2 steps of reasoning.",
    math: [
      "Random picks average 50 → target ⅔ × 50 ≈ 33",
      "If everyone picks 33 → target ⅔ × 33 = 22",
      "Then 22 → 15 → 10 → 7 → … (× ⅔ each step)",
      "Only 0 stays put: ⅔ × 0 = 0",
    ],
  },
  "2b": {
    correct: [],
    answer: "Defecting wins any single round, but teams that keep cooperating score the most.",
    insight:
      "Whatever the other team does, defecting pays more in one round (5 > 3 and 1 > 0). But if both teams reason that way, each gets 1 point a round instead of 3. That's the prisoner's dilemma. Over repeated rounds, strategies like tit-for-tat (cooperate first, then copy the other team's last move) build trust and score well, even though they never beat their opponent by much.",
    math: [
      "One round, they cooperate: defect 5 > cooperate 3",
      "One round, they defect: defect 1 > cooperate 0",
      "So defecting always wins the single round",
      "4 rounds, both always cooperate: 4 × 3 = 12 each",
      "4 rounds, both always defect: 4 × 1 = 4 each",
    ],
  },
  "3a": {
    correct: [2],
    answer: "About 91% (10/11).",
    insight:
      "Convict when acquitting would cause more expected harm than convicting. The math gives the threshold; choosing the 10-to-1 ratio is the ethical part. Any decision threshold trades false convictions against guilty people going free.",
    math: [
      "Let P = chance the defendant is guilty",
      "Harm of convicting = (1 − P) × 10",
      "Harm of acquitting = P × 1",
      "Convict when P > 10 × (1 − P) → 11P > 10",
      "P > 10/11 ≈ 91%",
    ],
  },
  bullets: {
    correct: [1],
    answer: "Where the fewest holes are: the engines and cockpit.",
    insight:
      "This is survivorship bias. You only see the planes that survived. Planes hit in the engines or cockpit never came back, so those holes are missing from the data. The clean areas on survivors are exactly where a hit is fatal.",
    math: [
      "Bullets hit all parts of a plane about equally",
      "Returning planes: many wing hits, few engine hits",
      "So most planes hit in the engines didn't return",
      "Missing holes = fatal hits → armor the engines and cockpit",
    ],
  },
  voting: {
    correct: [2],
    answer: "Always give every other team 0.",
    insight:
      "Your vote never changes your own score, and every point you give a rival can only help them pass you. So voting 0 is never worse than any other vote: it's the Nash equilibrium. If every team does it, all vote averages become 0 and only correct answers count, a worse outcome for everyone, just like the prisoner's dilemma. Real competitions fix this with mechanism design, like dropping extreme votes.",
    math: [
      "Your points = 2 × (correct) + avg vote from OTHER teams",
      "Your vote only changes your rivals' points",
      "Each point you give a rival can only help them pass you",
      "Vote 0 is never worse for you → weakly dominant",
    ],
  },
};

export { SURGEON_TABLE };
