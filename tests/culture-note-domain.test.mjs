import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../culture-note/app/domain/culture.ts", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const domain = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);

const slime = () => domain.createSlime({
  id: "slime-1",
  name: " 시험 슬라임 ",
  createdAt: "2026-09-07T00:00:00.000Z",
});

test("creates a two-slot culture with independent empty slots", () => {
  const state = domain.createCultureNoteState();
  assert.deepEqual(state.slots, [null, null]);
  assert.equal(slime().name, "시험 슬라임");
  assert.equal(slime().phraseMix, 0.35);
});

test("applies a different memory mix to each slime", () => {
  const base = { ...slime(), weights: { 사과: 1 }, phraseWeights: { 사과: -1 } };
  const wordFocused = { ...base, phraseMix: 0.2 };
  const phraseFocused = { ...base, id: "slime-2", phraseMix: 0.8 };

  assert.ok(domain.observeFood(wordFocused, "사과").value > 0);
  assert.ok(domain.observeFood(phraseFocused, "사과").value < 0);
  assert.equal(domain.analyzeObservation(wordFocused, domain.observeFood(wordFocused, "사과")).phraseRatio, 0.2);
  assert.equal(domain.analyzeObservation(phraseFocused, domain.observeFood(phraseFocused, "사과")).phraseRatio, 0.8);
});

test("observes without changing the slime", () => {
  const subject = slime();
  const before = structuredClone(subject);
  const observation = domain.observeFood(subject, "맛있는 사과");

  assert.deepEqual(subject, before);
  assert.equal(observation.value, 0);
  assert.deepEqual(observation.tokens, ["맛있는", "사과"]);
});

test("trains a reaction and records a reproducible journal entry", () => {
  const subject = slime();
  const observation = domain.observeFood(subject, "맛있는 사과");
  const trained = domain.trainSlime(subject, observation, 0.8, {
    id: () => "entry-1",
    now: () => "2026-09-07T01:00:00.000Z",
  });

  assert.equal(subject.entries.length, 0);
  assert.equal(trained.entries[0].id, "entry-1");
  assert.equal(trained.entries[0].target, 0.8);
  assert.ok(trained.entries[0].after > trained.entries[0].before);
  assert.ok(trained.weights["맛있는"] > 0);
  assert.ok(trained.weights["사과"] > 0);
});

test("builds one read-only analysis for summary and detailed observation views", () => {
  const subject = {
    ...slime(),
    bias: -0.05,
    weights: { "사과": 0.65 },
  };
  const observation = domain.observeFood(subject, "썩은 사과");
  const before = structuredClone(subject);
  const analysis = domain.analyzeObservation(subject, observation);

  assert.deepEqual(subject, before);
  assert.equal(analysis.bias, -0.05);
  assert.equal(analysis.wordRaw, 0.6);
  assert.equal(analysis.phraseKnown, false);
  assert.equal(analysis.wordRatio, 1);
  assert.equal(analysis.phraseRatio, 0);
  assert.equal(analysis.tokenInfluences[0].known, false);
  assert.equal(analysis.tokenInfluences[1].total, 0.65);
  assert.equal(analysis.output, observation.value);
});

test("two slimes can learn opposite reactions to the same food", () => {
  const initial = slime();
  let positive = initial;
  let negative = { ...initial, id: "slime-2", name: "반대 슬라임" };

  for (let index = 0; index < 8; index += 1) {
    positive = domain.trainSlime(positive, domain.observeFood(positive, "사과"), 1);
    negative = domain.trainSlime(negative, domain.observeFood(negative, "사과"), -1);
  }

  assert.ok(domain.observeFood(positive, "사과").value > 0.5);
  assert.ok(domain.observeFood(negative, "사과").value < -0.5);
});

test("rejects empty food and non-finite targets", () => {
  const subject = slime();
  assert.throws(() => domain.observeFood(subject, "   "), /at least one token/);
  assert.throws(
    () => domain.trainSlime(subject, domain.observeFood(subject, "사과"), Number.NaN),
    /target must be a finite number/,
  );
});
