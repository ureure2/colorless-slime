import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../culture-note/app/storage/culture-note-storage.ts", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText.replace('import { CULTURE_NOTE_PHRASE_MIX } from "../domain/culture";\n', "const CULTURE_NOTE_PHRASE_MIX = 0.35;\n");
const storageModule = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);

const memoryStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    snapshot: () => Object.fromEntries(values),
  };
};

const state = {
  slots: [{
    id: "slime-1",
    name: "첫 번째",
    createdAt: "2026-09-07T00:00:00.000Z",
    bias: 0,
    weights: {},
    phraseWeights: {},
    entries: [],
  }, null],
};

test("saves and restores exactly two culture slots", () => {
  const target = memoryStorage();
  const repository = storageModule.createBrowserCultureNoteRepository(target);
  repository.save(state);

  assert.equal(repository.load().slots.length, 2);
  assert.equal(repository.load().slots[0].name, "첫 번째");
  assert.equal(repository.load().slots[0].phraseMix, 0.35);
  assert.equal(repository.load().slots[1], null);
});

test("round-trips a per-slime memory mix and defaults older data", () => {
  const target = memoryStorage();
  const repository = storageModule.createBrowserCultureNoteRepository(target);
  repository.save({ slots: [{ ...state.slots[0], phraseMix: 0.7 }, null] });
  assert.equal(repository.load().slots[0].phraseMix, 0.7);

  const legacy = storageModule.createCultureNoteDocument(state, "2026-09-07T00:00:00.000Z");
  assert.equal(legacy.state.slots[0].phraseMix, 0.35);
});

test("returns null without creating data when nothing was saved", () => {
  const target = memoryStorage();
  const repository = storageModule.createBrowserCultureNoteRepository(target);

  assert.equal(repository.load(), null);
  assert.deepEqual(target.snapshot(), {});
});

test("clears only the culture note document", () => {
  const key = storageModule.CULTURE_NOTE_STORAGE_KEY;
  const target = memoryStorage({ [key]: "saved", unrelated: "keep" });
  storageModule.createBrowserCultureNoteRepository(target).clear();

  assert.deepEqual(target.snapshot(), { unrelated: "keep" });
});

test("rejects corrupted and future data without overwriting the original", () => {
  const key = storageModule.CULTURE_NOTE_STORAGE_KEY;
  const target = memoryStorage({ [key]: '{"format":"broken"}' });
  const repository = storageModule.createBrowserCultureNoteRepository(target);

  assert.throws(() => repository.load(), /not culture note data/);
  assert.equal(target.snapshot()[key], '{"format":"broken"}');

  assert.throws(() => storageModule.parseCultureNoteDocument({
    format: storageModule.CULTURE_NOTE_FORMAT,
    schemaVersion: 2,
    savedAt: "2026-09-07T00:00:00.000Z",
    state,
  }), /not supported/);
});

test("rejects unsafe numeric state", () => {
  assert.throws(() => storageModule.createCultureNoteDocument({
    slots: [{ ...state.slots[0], bias: Number.NaN }, null],
  }), /must be finite/);
});
