import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../culture-note/app/App.tsx", import.meta.url), "utf8");
const i18n = await readFile(new URL("../culture-note/app/i18n.tsx", import.meta.url), "utf8");
const trace = await readFile(new URL("../culture-note/app/observation-trace.ts", import.meta.url), "utf8");

const koStart = i18n.indexOf("  ko: {");
const enStart = i18n.indexOf("  en: {");
const dictionaryEnd = i18n.indexOf("\n  },\n} as const;", enStart);
const koSection = i18n.slice(koStart, enStart);
const enSection = i18n.slice(enStart, dictionaryEnd);
const keysIn = (section) => [...section.matchAll(/\b([a-z][A-Za-z0-9]*):\s*"/g)].map((match) => match[1]);
const koKeys = keysIn(koSection);
const enKeys = keysIn(enSection);

test("keeps Korean and English dictionaries complete and aligned", () => {
  assert.ok(koKeys.length > 100, "the product dictionary should cover the complete UI");
  assert.deepEqual([...new Set(enKeys)].sort(), [...new Set(koKeys)].sort());
  assert.equal(koKeys.length, new Set(koKeys).size, "Korean keys must be unique");
  assert.equal(enKeys.length, new Set(enKeys).size, "English keys must be unique");
});

test("defines every translation key used by the app", () => {
  const usedKeys = [...app.matchAll(/\bt\("([a-z][A-Za-z0-9]*)"/g)].map((match) => match[1]);
  const knownKeys = new Set(koKeys);
  const missing = [...new Set(usedKeys)].filter((key) => !knownKeys.has(key));
  assert.deepEqual(missing, []);
});

test("keeps user-facing Korean text out of the translated component tree", () => {
  assert.doesNotMatch(app, /[가-힣]/);
  assert.match(app, /placeholder=\{t\("foodPlaceholder"\)\}/);
  assert.match(app, /aria-label=\{t\("observationClose"\)\}/);
  assert.match(app, /setExportStatus\(t\("copied"\)\)/);
  assert.match(app, /setStorageWarning\(t\("storageSaveFailed"\)\)/);
});

test("switches document language, metadata, and journal date locale", () => {
  assert.match(app, /document\.documentElement\.lang = language/);
  assert.match(app, /document\.title = t\("documentTitle"\)/);
  assert.match(app, /meta\[name="description"\]/);
  assert.match(app, /language === "ko" \? "ko-KR" : "en-US"/);
  assert.match(app, /saveCultureNoteLanguage\(window\.localStorage, nextLanguage\)/);
});

test("keeps exported AI trace fields language-neutral", () => {
  assert.doesNotMatch(trace, /useI18n|translate\(|\bt\(/);
  assert.match(trace, /OBSERVATION_TRACE_FORMAT = "musaek-observation-trace"/);
  assert.match(trace, /interpretation: \[interpretation\(analysis\.output\)\]/);
  assert.match(trace, /\? "positive"[\s\S]*\? "negative" : "neutral"/);
});
