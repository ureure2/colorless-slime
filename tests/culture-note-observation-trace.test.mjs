import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../culture-note/app/observation-trace.ts", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText.replace('import { CULTURE_NOTE_PHRASE_MIX } from "./domain/culture";\n', "const CULTURE_NOTE_PHRASE_MIX = 0.35;\n");
const traceModule = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);

const slime = {
  id: "slime-a",
  name: "대비슬라임 A",
  createdAt: "2026-09-07T00:00:00.000Z",
  bias: -0.05,
  weights: { 사과: 0.65 },
  phraseWeights: {},
  phraseMix: 0.7,
  entries: [],
};
const analysis = {
  observation: { food: "썩은 사과", phraseKey: "썩은 사과", tokens: ["썩은", "사과"], value: 0.54 },
  bias: -0.05,
  tokenInfluences: [
    { token: "썩은", count: 1, known: false, weight: 0, total: 0 },
    { token: "사과", count: 1, known: true, weight: 0.65, total: 0.65 },
  ],
  wordRaw: 0.6,
  phraseKnown: false,
  phraseRaw: 0,
  wordRatio: 1,
  phraseRatio: 0,
  combinedRaw: 0.6,
  output: 0.54,
};

test("creates one language-neutral inference trace with the slime memory mix", () => {
  const trace = traceModule.createObservationTrace({
    slime,
    slotIndex: 0,
    analysis,
    generatedAt: "2026-09-07T12:00:00.000Z",
  });

  assert.equal(trace.trace_format, "musaek-observation-trace");
  assert.equal(trace.version, 1);
  assert.deepEqual(trace.subject, { id: "slime-a", name: "대비슬라임 A", slot: 1 });
  assert.deepEqual(trace.stages[2].configured_ratio, { word_space: 0.3, phrase_space: 0.7 });
  assert.deepEqual(trace.stages[2].effective_ratio, { word_space: 1, phrase_space: 0 });
  assert.equal(trace.stages[1].output, null);
  assert.deepEqual(trace.final_output.interpretation, ["positive"]);
  assert.equal(trace.feedback_reference, null);
});

test("includes a real feedback target only when one is associated", () => {
  const trace = traceModule.createObservationTrace({ slime, slotIndex: 1, analysis, feedbackTarget: 0.8 });
  assert.deepEqual(trace.feedback_reference, { target: [0.8], used_during_inference: false });
});

test("builds a safe trace filename", () => {
  assert.equal(
    traceModule.observationTraceFilename({ ...slime, name: " 대비 / A " }, "2026-09-07T12:00:00.000Z"),
    "observation-trace-대비-A-2026-09-07.json",
  );
});
