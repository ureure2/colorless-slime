import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../culture-note/app/App.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../culture-note/app/globals.css", import.meta.url), "utf8");

test("keeps the new app limited to the three agreed views", () => {
  assert.match(app, /id: "single", labelKey: "navSingle"/);
  assert.match(app, /id: "together", labelKey: "navTogether"/);
  assert.match(app, /id: "journal", labelKey: "navJournal"/);
  assert.doesNotMatch(app, /연구 기록|표본함|오늘의 관찰|개체 분석/);
  assert.match(app, /I18nProvider language=\{language\}/);
});

test("supports creation, single training, comparison, and journal review", () => {
  assert.match(app, /createSlime\(\{ name \}\)/);
  assert.match(app, /observeFood\(activeSlime, singleFood\)/);
  assert.match(app, /trainSlime\(activeSlime, singleSession\.observation, target\)/);
  assert.match(app, /type="range" min="-1" max="1" step="0\.1"/);
  assert.match(app, /const signedValue = \(value: number\).*value\.toFixed\(2\)/);
  assert.doesNotMatch(app, /reactionPercent|signedReaction|target \/ 100/);
  assert.match(app, /t\("togetherReadOnly"\)/);
  assert.match(app, /function CultureJournal/);
  assert.match(app, /t\("before"\)/);
  assert.match(app, /t\("after"\)/);
});

test("uses the isolated browser repository and preserves storage failures", () => {
  assert.match(app, /createBrowserCultureNoteRepository\(window\.localStorage\)/);
  assert.match(app, /if \(!initial\.persistenceReady\) return/);
  assert.match(app, /repository\.save\(next\)/);
  assert.match(app, /t\("storageReadFailed"\)/);
  assert.doesNotMatch(app, /DEVICE_STORAGE_KEYS|musaek-slime-user-lab1-v1/);
});

test("uses one D2Coding family and responsive notebook layout", () => {
  assert.match(styles, /--font-app: "D2Coding", Consolas, monospace/);
  assert.equal((styles.match(/font-family:/g) ?? []).length, 3);
  assert.match(styles, /font-family: var\(--font-app\)/);
  assert.match(styles, /@media \(max-width: 680px\)/);
  assert.match(styles, /padding: 10px max\(18px, calc\(\(100vw - 1180px\) \/ 2\)\)/);
  assert.match(styles, /\.topbar \{ padding-right: 10px; padding-left: 10px;/);
  assert.match(styles, /--text-body: 0\.875rem/);
  assert.doesNotMatch(styles, /Georgia|Batang|Malgun Gothic/);
});

test("softens empty-slot portraits until a slime is created", () => {
  assert.match(app, /function SlimePortrait\(\{ slotIndex, compact = false, muted = false \}/);
  assert.match(app, /<SlimePortrait slotIndex=\{slotIndex\} muted \/>/);
  assert.match(app, /<SlimePortrait slotIndex=\{slotIndex\} compact muted=\{!slime\} \/>/);
  assert.match(styles, /\.slime-photo\.muted \{[^}]*opacity: \.34;[^}]*filter: grayscale\(1\) contrast\(\.76\) blur\(\.6px\)/);
});

test("draws continuous ruled lines across the notebook work page", () => {
  assert.match(styles, /--user-ui-notebook-rule:/);
  assert.match(styles, /\.work-page \{[\s\S]*repeating-linear-gradient\([\s\S]*to bottom/);
  assert.match(styles, /var\(--user-ui-notebook-rule\) 31px/);
  assert.match(styles, /var\(--user-ui-notebook-rule\) 32px/);
});

test("shows the current single-culture observation in a compact microscope memo", () => {
  assert.match(app, /function MicroscopeMemo/);
  assert.match(app, /MICROSCOPE \/ SUMMARY/);
  assert.match(app, /t\("finalReaction"\)/);
  assert.match(app, /t\("wordSpace"\)/);
  assert.match(app, /t\("phraseSpace"\)/);
  assert.match(app, /t\("effectiveRatio"\)/);
  assert.match(app, /analyzeObservation\(activeSlime, observation\)/);
  assert.match(styles, /\.memo-drawer/);
  assert.match(styles, /\.memo-tab/);
  assert.match(styles, /width: min\(310px, calc\(100vw - 54px\)\)/);
  assert.match(styles, /\.memo-current > div[^}]*white-space: nowrap/);
  assert.match(styles, /\.memo-current strong[^}]*text-overflow: ellipsis/);
});

test("keeps the latest observation visible until another observation replaces it", () => {
  assert.doesNotMatch(app, /setSelectedSlot\(slotIndex\);\s*setSingleSession\(null\)/);
  assert.doesNotMatch(app, /setSingleFood\(value\);\s*setSingleSession\(null\)/);
  assert.match(app, /const visibleSession = props\.session/);
  assert.match(app, /sessionSlimeName=\{observedSlime\?\.name \?\? null\}/);
  assert.match(app, /disabled=\{!sessionMatchesSelection\}/);
  assert.match(app, /t\("sessionOriginNotice"\)/);
});

test("opens the complete observation record in an accessible popup", () => {
  assert.match(app, /function ObservationDialog/);
  assert.match(app, /role="dialog"/);
  assert.match(app, /aria-modal="true"/);
  assert.match(app, /event\.key === "Escape"/);
  assert.match(app, /event\.key !== "Tab"/);
  assert.match(app, /event\.target === event\.currentTarget/);
  assert.match(app, /microscope-detail-trigger/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /t\("calcWordTitle"\)/);
  assert.match(app, /t\("calcPhraseTitle"\)/);
  assert.match(app, /t\("calcMixTitle"\)/);
  assert.match(app, /t\("calcOutputTitle"\)/);
  assert.match(styles, /\.observation-backdrop/);
  assert.match(styles, /\.observation-dialog/);
});

test("saves or copies the same AI observation trace", () => {
  assert.match(app, /createObservationTrace\(/);
  assert.match(app, /const traceJson = useMemo\(\(\) => JSON\.stringify\(trace, null, 2\)/);
  assert.match(app, /observationTraceFilename\(props\.slime, trace\.generated_at\)/);
  assert.match(app, /navigator\.clipboard\.writeText\(traceJson\)/);
  assert.match(app, /t\("save"\).*t\("copy"\)/);
  assert.match(app, /t\("copyFailed"\)/);
  assert.match(styles, /\.observation-export-actions/);
});

test("places an accessible settings dialog below the culture slots", () => {
  assert.match(app, /id="settings-trigger"/);
  assert.match(app, /function SettingsDialog/);
  assert.match(app, /aria-labelledby="settings-dialog-title"/);
  assert.match(app, /onLanguage\("en"\)/);
  assert.match(app, /t\("settingsBackupAction"\)/);
  assert.match(app, /t\("settingsResetAction"\)/);
  assert.match(app, /getElementById\("settings-trigger"\)\?\.focus/);
  assert.match(styles, /\.settings-trigger/);
  assert.match(styles, /\.settings-backdrop/);
  assert.match(styles, /\.settings-dialog/);
});

test("stores the UI language separately from culture data", async () => {
  const i18n = await readFile(new URL("../culture-note/app/i18n.tsx", import.meta.url), "utf8");
  assert.match(i18n, /type Language = "ko" \| "en"/);
  assert.match(i18n, /musaek-slime-culture-note-language/);
  assert.match(app, /loadCultureNoteLanguage\(window\.localStorage\)/);
  assert.match(app, /saveCultureNoteLanguage\(window\.localStorage, nextLanguage\)/);
  assert.match(app, /document\.documentElement\.lang = language/);
});

test("exports versioned culture data and confirms destructive reset", () => {
  assert.match(app, /createCultureNoteDocument\(state\)/);
  assert.match(app, /new Blob\(\[JSON\.stringify\(backup, null, 2\)\]/);
  assert.match(app, /culture-note-backup-\$\{backup\.savedAt\.slice\(0, 10\)\}\.json/);
  assert.match(app, /URL\.revokeObjectURL\(url\)/);
  assert.equal((app.match(/document\.body\.appendChild\(anchor\)/g) ?? []).length, 2);
  assert.match(app, /t\("settingsResetWarning"\)/);
  assert.match(app, /repository\.clear\(\)/);
  assert.match(app, /t\("storageResetFailed"\)/);
});

test("opens a per-slime learning summary and applies its memory mix", () => {
  assert.match(app, /id="learning-profile-trigger"/);
  assert.match(app, /function LearningProfileDialog/);
  assert.match(app, /t\("learningRecords"\)/);
  assert.match(app, /t\("learnedWords"\)/);
  assert.match(app, /t\("learnedPhrases"\)/);
  assert.match(app, /t\("latestChange"\)/);
  assert.match(app, /t\("phraseMemoryRatio"\)/);
  assert.match(app, /step="5"/);
  assert.match(app, /const updated = \{ \.\.\.activeSlime, phraseMix \}/);
  assert.match(app, /analyzeObservation\(updated, observation\)/);
  assert.match(app, /setComparison\(\[\]\)/);
  assert.match(styles, /\.learning-dialog/);
});
