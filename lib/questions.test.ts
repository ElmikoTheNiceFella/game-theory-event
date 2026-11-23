import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS } from "./questions.ts";
import { ANSWERS } from "./answers.ts";

test("every story is at most 4 cards and only uses its own cast", () => {
  for (const q of QUESTIONS) {
    assert.ok(q.dialogue.length >= 1 && q.dialogue.length <= 4, `${q.id} has ${q.dialogue.length} cards`);
    for (const l of q.dialogue) assert.ok(l.who === "narrator" || q.cast[l.who], `${q.id}: unknown speaker ${l.who}`);
  }
});

test("every question has an answer key with math, and correct indices point at real choices", () => {
  for (const q of QUESTIONS) {
    const a = ANSWERS[q.id];
    assert.ok(a, `${q.id} has no answer`);
    assert.ok(a.math.length >= 3, `${q.id} math too short`);
    if (q.kind === "mcq") assert.ok(a.correct.length > 0 && a.correct.every((i) => i >= 0 && i < q.choices.length), `${q.id} bad index`);
  }
});
