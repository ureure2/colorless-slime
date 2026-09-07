/* eslint-disable @next/next/no-img-element */
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import slimeOneImage from "../../public/assets/photo/slime-1.png";
import slimeTwoImage from "../../public/assets/photo/slime-2.png";
import {
  analyzeObservation,
  CULTURE_NOTE_PHRASE_MIX,
  createCultureNoteState,
  createSlime,
  observeFood,
  trainSlime,
  type CultureNoteState,
  type Observation,
  type ObservationAnalysis,
  type Slime,
  type TrainingEntry,
} from "./domain/culture";
import { createBrowserCultureNoteRepository, createCultureNoteDocument } from "./storage/culture-note-storage";
import { createObservationTrace, observationTraceFilename } from "./observation-trace";
import { createTranslator, I18nProvider, loadCultureNoteLanguage, saveCultureNoteLanguage, useI18n, type Language, type Translator } from "./i18n";

type View = "single" | "together" | "journal";
type SingleSession = {
  slotId: string;
  stage: "observed" | "trained" | "verified";
  observation: Observation;
  analysis: ObservationAnalysis;
  beforeTeaching: number | null;
  target: number | null;
};
type ComparedSlime = { slime: Slime; slotIndex: number; observation: Observation };

const NAV_ITEMS: { id: View; labelKey: "navSingle" | "navTogether" | "navJournal"; code: string }[] = [
  { id: "single", labelKey: "navSingle", code: "CULTURE / SINGLE" },
  { id: "together", labelKey: "navTogether", code: "CULTURE / TOGETHER" },
  { id: "journal", labelKey: "navJournal", code: "CULTURE / JOURNAL" },
];
const SLIME_IMAGES = [slimeOneImage, slimeTwoImage];

const reactionLabel = (value: number, t: Translator) => value > 0.15 ? t("reactionLike") : value < -0.15 ? t("reactionDislike") : t("reactionNeutral");
const signedValue = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
const formatDateTime = (value: string, language: Language) => new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-US", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
}).format(new Date(value));

const replaceSlot = (state: CultureNoteState, slotIndex: number, slime: Slime): CultureNoteState => {
  const slots: CultureNoteState["slots"] = [...state.slots];
  slots[slotIndex] = slime;
  return { slots };
};

function SlimePortrait({ slotIndex, compact = false, muted = false }: { slotIndex: number; compact?: boolean; muted?: boolean }) {
  return <img
    className={`slime-photo${compact ? " compact" : ""}${muted ? " muted" : ""}`}
    src={SLIME_IMAGES[slotIndex]}
    alt=""
  />;
}

function ReactionMeter({ value, label }: { value: number; label?: string }) {
  const { t } = useI18n();
  const visibleLabel = label ?? t("reactionCurrent");
  const position = `${(Math.max(-1, Math.min(1, value)) + 1) * 50}%`;
  return <section className="reaction-result" aria-label={`${visibleLabel}: ${reactionLabel(value, t)} ${signedValue(value)}`}>
    <div className="reaction-heading">
      <span>{visibleLabel}</span>
      <strong>{reactionLabel(value, t)} <b>{signedValue(value)}</b></strong>
    </div>
    <div className="reaction-track" aria-hidden="true"><i style={{ left: position }} /></div>
    <div className="reaction-ends" aria-hidden="true"><span>{t("reactionDislike")}</span><span>{t("reactionNeutral")}</span><span>{t("reactionLike")}</span></div>
  </section>;
}

function observationSummary(analysis: ObservationAnalysis, t: Translator) {
  if (analysis.phraseKnown) return t("summaryPhrase");
  if (analysis.tokenInfluences.some((item) => item.known)) {
    return t("summaryWord");
  }
  return t("summaryDefault");
}

function MicroscopeMemo(props: {
  open: boolean;
  slime: Slime | null;
  analysis: ObservationAnalysis | null;
  onToggle: () => void;
  onOpenDetail: () => void;
}) {
  const { t } = useI18n();
  const wordDecision = props.analysis ? Math.tanh(props.analysis.wordRaw) : 0;
  const phraseDecision = props.analysis?.phraseKnown ? Math.tanh(props.analysis.phraseRaw) : null;
  return <aside className={`memo-drawer${props.open ? " open" : ""}`} aria-label={t("microscopeMemo")}>
    <button type="button" className="memo-tab" aria-expanded={props.open} aria-controls="microscope-memo" onClick={props.onToggle}>
      <span>MEMO</span><i aria-hidden="true">{props.open ? "›" : "‹"}</i>
    </button>
    <section id="microscope-memo" className="memo-sheet" aria-hidden={!props.open}>
      <header><div><span>MICROSCOPE / SUMMARY</span><h2>{t("microscopeMemo")}</h2></div><button type="button" tabIndex={props.open ? 0 : -1} onClick={props.onToggle} aria-label={t("microscopeMemoClose")}>×</button></header>
      {!props.analysis || !props.slime ? <div className="memo-empty">
        <strong>{t("microscopeWaiting")}</strong>
        <p>{t("microscopeWaitingHelp")}</p>
      </div> : <div className="memo-observation">
        <div className="memo-current"><div><span>{t("currentObservation")}</span><i aria-hidden="true">·</i><strong title={props.slime.name}>{props.slime.name}</strong></div><p>“{props.analysis.observation.food}”</p></div>
        <dl className="memo-metrics">
          <div><dt>{t("finalReaction")}</dt><dd>{reactionLabel(props.analysis.output, t)} <b>{signedValue(props.analysis.output)}</b></dd></div>
          <div><dt>{t("wordSpace")}</dt><dd>{signedValue(wordDecision)}</dd></div>
          <div><dt>{t("phraseSpace")}</dt><dd>{phraseDecision === null ? t("noMemory") : signedValue(phraseDecision)}</dd></div>
        </dl>
        <div className="memo-ratio"><span>{t("effectiveRatio")}</span><strong>{t("ratioValues", { word: Math.round(props.analysis.wordRatio * 100), phrase: Math.round(props.analysis.phraseRatio * 100) })}</strong></div>
        <p className="memo-summary-copy">{observationSummary(props.analysis, t)}</p>
        <button id="microscope-detail-trigger" type="button" className="memo-detail-button" onClick={props.onOpenDetail}>{t("viewFullObservation")}</button>
      </div>}
    </section>
  </aside>;
}

function ObservationDialog(props: {
  slime: Slime;
  slotIndex: number;
  analysis: ObservationAnalysis;
  feedbackTarget: number | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [exportStatus, setExportStatus] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      props.onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [])];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const analysis = props.analysis;
  const trace = useMemo(() => createObservationTrace({
    slime: props.slime,
    slotIndex: props.slotIndex,
    analysis,
    feedbackTarget: props.feedbackTarget,
  }), [analysis, props.feedbackTarget, props.slime, props.slotIndex]);
  const traceJson = useMemo(() => JSON.stringify(trace, null, 2), [trace]);
  const saveTrace = () => {
    const blob = new Blob([traceJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = observationTraceFilename(props.slime, trace.generated_at);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setExportStatus(t("saved"));
  };
  const copyTrace = async () => {
    try {
      await navigator.clipboard.writeText(traceJson);
      setExportStatus(t("copied"));
    } catch {
      setExportStatus(t("copyFailed"));
    }
  };
  const wordPercent = Math.round(analysis.wordRatio * 100);
  const phrasePercent = Math.round(analysis.phraseRatio * 100);
  return <div className="observation-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose(); }}>
    <section ref={dialogRef} className="observation-dialog" role="dialog" aria-modal="true" aria-labelledby="observation-dialog-title" onKeyDown={handleKeyDown}>
      <header className="observation-dialog-header">
        <div><span>MICROSCOPE / OBSERVATION RECORD</span><h2 id="observation-dialog-title">{t("observationRecord")}</h2><p>{props.slime.name} · “{analysis.observation.food}”</p></div>
        <button ref={closeButtonRef} type="button" onClick={props.onClose} aria-label={t("observationClose")}>×</button>
      </header>

      <div className="observation-dialog-body">
        <section className="observation-overview" aria-label={t("observationSummaryLabel")}>
          <div><span>{t("finalReaction")}</span><strong>{signedValue(analysis.output)}</strong><small>{reactionLabel(analysis.output, t)}</small></div>
          <div><span>{t("wordSpace")}</span><strong>{signedValue(analysis.wordRaw)}</strong><small>{t("internalValue")}</small></div>
          <div><span>{t("phraseSpace")}</span><strong>{analysis.phraseKnown ? signedValue(analysis.phraseRaw) : t("noMemory")}</strong><small>{analysis.phraseKnown ? t("learnedPhrase") : t("excludedCalculation")}</small></div>
        </section>
        <p className="observation-reading">{observationSummary(analysis, t)}</p>

        <section className="calculation-section">
          <header><span>01</span><div><h3>{t("calcWordTitle")}</h3><p>{t("calcWordHelp")}</p></div></header>
          <dl className="calculation-list">
            <div><dt>{t("commonBias")}</dt><dd>{signedValue(analysis.bias)}</dd></div>
            {analysis.tokenInfluences.map((item) => <div key={item.token}>
              <dt>{t("tokenInfluence", { token: item.token })}{item.count > 1 ? ` × ${item.count}` : ""}</dt>
              <dd>{item.known ? signedValue(item.total) : t("neverLearned")}</dd>
            </div>)}
            <div className="calculation-total"><dt>{t("wordSpaceValue")}</dt><dd>≈ {signedValue(analysis.wordRaw)}</dd></div>
          </dl>
        </section>

        <section className="calculation-section">
          <header><span>02</span><div><h3>{t("calcPhraseTitle")}</h3><p>{t("calcPhraseHelp")}</p></div></header>
          <dl className="calculation-list">
            <div><dt>{t("phraseWeight", { phrase: analysis.observation.phraseKey })}</dt><dd>{analysis.phraseKnown ? signedValue(analysis.phraseRaw) : t("noMemoryExcluded")}</dd></div>
          </dl>
        </section>

        <section className="calculation-section">
          <header><span>03</span><div><h3>{t("calcMixTitle")}</h3><p>{t("calcMixHelp")}</p></div></header>
          <div className="ratio-display"><span>{t("wordSymbolPercent", { value: wordPercent })}</span><i style={{ width: `${wordPercent}%` }} /><span>{t("fullPhrasePercent", { value: phrasePercent })}</span></div>
          <div className="formula-line">({signedValue(analysis.wordRaw)} × {wordPercent}%) + ({signedValue(analysis.phraseRaw)} × {phrasePercent}%) ≈ <strong>{signedValue(analysis.combinedRaw)}</strong></div>
        </section>

        <section className="calculation-section output-section">
          <header><span>04</span><div><h3>{t("calcOutputTitle")}</h3><p>{t("calcOutputHelp")}</p></div></header>
          <div className="formula-line">tanh({signedValue(analysis.combinedRaw)}) ≈ <strong>{signedValue(analysis.output)}</strong></div>
        </section>
      </div>

      <footer className="observation-dialog-footer">
        <div><strong>{t("analysisData")}</strong><p>{t("analysisDataHelp")}</p>{exportStatus && <small role="status">{exportStatus}</small>}</div>
        <div className="observation-export-actions"><button type="button" onClick={saveTrace}>{t("save")}</button><button type="button" onClick={copyTrace}>{t("copy")}</button></div>
      </footer>
    </section>
  </div>;
}

function SettingsDialog(props: { language: Language; onLanguage: (language: Language) => void; onClose: () => void; onExport: () => void; onReset: () => void }) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      props.onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [])];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return <div className="settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose(); }}>
    <section ref={dialogRef} className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title" onKeyDown={handleKeyDown}>
      <header><div><span>APPLICATION / SETTINGS</span><h2 id="settings-dialog-title">{t("settings")}</h2></div><button ref={closeButtonRef} type="button" onClick={props.onClose} aria-label={t("settingsClose")}>×</button></header>
      <div className="settings-body">
        <section className="settings-section"><div><h3>{t("settingsLanguage")}</h3><p>{t("settingsLanguageHelp")}</p></div><div className="language-placeholder" aria-label={t("settingsLanguageLabel")}><button type="button" aria-pressed={props.language === "ko"} onClick={() => props.onLanguage("ko")}>{t("settingsKorean")}</button><button type="button" aria-pressed={props.language === "en"} onClick={() => props.onLanguage("en")}>{t("settingsEnglish")}</button></div></section>
        <section className="settings-section"><div><h3>{t("settingsBackup")}</h3><p>{t("settingsBackupHelp")}</p></div><button type="button" className="settings-action" onClick={props.onExport}>{t("settingsBackupAction")}</button></section>
        <section className="settings-section settings-danger"><div><h3>{t("settingsReset")}</h3><p>{t("settingsResetHelp")}</p></div>{confirmingReset
          ? <div className="reset-confirm" role="alert"><strong>{t("settingsResetWarning")}</strong><div><button type="button" onClick={() => setConfirmingReset(false)}>{t("cancel")}</button><button type="button" onClick={props.onReset}>{t("settingsResetConfirm")}</button></div></div>
          : <button type="button" onClick={() => setConfirmingReset(true)}>{t("settingsResetAction")}</button>}
        </section>
      </div>
    </section>
  </div>;
}

function LearningProfileDialog(props: { slime: Slime; onClose: () => void; onApply: (phraseMix: number) => void }) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [phrasePercent, setPhrasePercent] = useState(Math.round((props.slime.phraseMix ?? CULTURE_NOTE_PHRASE_MIX) * 100));
  const latest = props.slime.entries.at(-1) ?? null;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      props.onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [])];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return <div className="learning-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose(); }}>
    <section ref={dialogRef} className="learning-dialog" role="dialog" aria-modal="true" aria-labelledby="learning-dialog-title" onKeyDown={handleKeyDown}>
      <header><div><span>LEARNING / PROFILE</span><h2 id="learning-dialog-title">{t("learningSummaryTitle", { name: props.slime.name })}</h2></div><button ref={closeButtonRef} type="button" onClick={props.onClose} aria-label={t("learningSummaryClose")}>×</button></header>
      <div className="learning-body">
        <section className="learning-counts" aria-label={t("learningAmount")}><div><span>{t("learningRecords")}</span><strong>{t("countTimes", { count: props.slime.entries.length })}</strong></div><div><span>{t("learnedWords")}</span><strong>{t("countItems", { count: Object.keys(props.slime.weights).length })}</strong></div><div><span>{t("learnedPhrases")}</span><strong>{t("countItems", { count: Object.keys(props.slime.phraseWeights).length })}</strong></div></section>
        <section className="learning-latest"><h3>{t("latestChange")}</h3>{latest ? <><p>“{latest.food}”</p><div><span>{signedValue(latest.before)}</span><i aria-hidden="true">→</i><strong>{signedValue(latest.after)}</strong><small>{t("targetValue", { value: signedValue(latest.target) })}</small></div></> : <p className="learning-empty">{t("noLearnedMemory")}</p>}</section>
        <section className="memory-mix"><header><div><h3>{t("memoryMix")}</h3><p>{t("memoryMixHelp")}</p></div><strong>{t("memoryMixValues", { word: 100 - phrasePercent, phrase: phrasePercent })}</strong></header><input aria-label={t("phraseMemoryRatio")} type="range" min="0" max="100" step="5" value={phrasePercent} onChange={(event) => setPhrasePercent(Number(event.target.value))} /><div><span>{t("wordCentered")}</span><span>{t("phraseCentered")}</span></div><small>{t("phraseFallback")}</small></section>
      </div>
      <footer><button type="button" className="secondary-button" onClick={props.onClose}>{t("cancel")}</button><button type="button" className="primary-button" onClick={() => props.onApply(phrasePercent / 100)}>{t("applyChanges")}</button></footer>
    </section>
  </div>;
}

function EmptySlotForm({ slotIndex, onCreate }: { slotIndex: number; onCreate: (name: string) => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError(t("slimeNameRequired"));
      return;
    }
    onCreate(name);
  };

  return <section className="creation-panel" aria-labelledby="create-slime-title">
    <SlimePortrait slotIndex={slotIndex} muted />
    <div>
      <span className="section-code">SLOT {String(slotIndex + 1).padStart(2, "0")} / CREATE</span>
      <h2 id="create-slime-title">{t("createSlime")}</h2>
      <p>{t("createSlimeHelp")}</p>
    </div>
    <form onSubmit={submit} noValidate>
      <label htmlFor="slime-name">{t("slimeName")}</label>
      <input
        id="slime-name"
        value={name}
        maxLength={40}
        autoComplete="off"
        autoFocus
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "slime-name-error" : undefined}
        onChange={(event) => { setName(event.target.value); setError(""); }}
        placeholder={t("slimeNamePlaceholder")}
      />
      {error && <p id="slime-name-error" className="error-message" role="alert">{error}</p>}
      <button type="submit" className="primary-button">{t("startCulture")}</button>
    </form>
  </section>;
}

function SingleCulture(props: {
  slime: Slime;
  slotIndex: number;
  food: string;
  target: number;
  session: SingleSession | null;
  sessionSlimeName: string | null;
  onFoodChange: (value: string) => void;
  onTargetChange: (value: number) => void;
  onObserve: () => void;
  onTrain: () => void;
  onOpenLearning: () => void;
}) {
  const { t } = useI18n();
  const visibleSession = props.session;
  const sessionMatchesSelection = visibleSession?.slotId === props.slime.id;
  return <div className="single-culture">
    <section className="subject-heading">
      <SlimePortrait slotIndex={props.slotIndex} compact />
      <div><span>SLOT {String(props.slotIndex + 1).padStart(2, "0")}</span><h2>{props.slime.name}</h2><p>{t("learningRecordCount", { count: props.slime.entries.length })}</p></div>
      <button id="learning-profile-trigger" type="button" onClick={props.onOpenLearning}><span>{t("memoryMix")}</span><strong>{t("memoryMixValues", { word: Math.round((1 - props.slime.phraseMix) * 100), phrase: Math.round(props.slime.phraseMix * 100) })}</strong><i>{t("adjust")}</i></button>
    </section>

    <section className="culture-step">
      <header><span>01</span><div><h3>{t("prepareFood")}</h3><p>{t("prepareFoodHelp")}</p></div></header>
      <div className="food-input-row">
        <label htmlFor="single-food">{t("foodSentence")}</label>
        <input
          id="single-food"
          value={props.food}
          maxLength={120}
          autoComplete="off"
          onChange={(event) => props.onFoodChange(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && props.food.trim()) props.onObserve(); }}
          placeholder={t("foodPlaceholder")}
        />
        <button type="button" className="primary-button" onClick={props.onObserve} disabled={!props.food.trim()}>
          {sessionMatchesSelection && visibleSession?.stage === "trained" ? t("observeAgain") : t("observeReaction")}
        </button>
      </div>
    </section>

    {visibleSession && <section className="culture-step result-step">
      <header><span>02</span><div><h3>{visibleSession.stage === "trained" ? t("learningComplete") : t("observationResult")}</h3><p>{t("recentRecord", { name: props.sessionSlimeName ?? t("genericSlime"), food: visibleSession.observation.food })}</p></div></header>
      {visibleSession.stage === "trained" ? <div className="trained-message" role="status">
        <strong>{t("targetRecorded", { value: signedValue(visibleSession.target ?? 0) })}</strong>
        <p>{t("observeAgainHelp")}</p>
      </div> : <>
        {visibleSession.stage === "verified" && visibleSession.beforeTeaching !== null && <div className="before-after">
          <span>{t("beforeLearning")} <b>{signedValue(visibleSession.beforeTeaching)}</b></span>
          <i aria-hidden="true">→</i>
          <span>{t("afterLearning")} <b>{signedValue(visibleSession.observation.value)}</b></span>
        </div>}
        <ReactionMeter value={visibleSession.observation.value} />
        <div className="teaching-control">
          <div className="teaching-label"><label htmlFor="reaction-target">{t("teachReaction")}</label><output htmlFor="reaction-target">{t("targetValue", { value: signedValue(props.target) })}</output></div>
          <div className="range-row"><span>{t("reactionDislike")}</span><input id="reaction-target" type="range" min="-1" max="1" step="0.1" value={props.target} onChange={(event) => props.onTargetChange(Number(event.target.value))} /><span>{t("reactionLike")}</span></div>
          {!sessionMatchesSelection && <p className="session-origin-notice">{t("sessionOriginNotice")}</p>}
          <button type="button" className="primary-button" onClick={props.onTrain} disabled={!sessionMatchesSelection}>{t("teachThisReaction")}</button>
        </div>
      </>}
    </section>}
  </div>;
}

function TogetherCulture(props: {
  slots: CultureNoteState["slots"];
  food: string;
  comparison: ComparedSlime[];
  onFoodChange: (value: string) => void;
  onObserve: () => void;
  onOpenSlot: (index: number) => void;
}) {
  const { t } = useI18n();
  const ready = props.slots.every(Boolean);
  if (!ready) return <section className="empty-state together-empty">
    <span>2 / 2</span>
    <strong>{t("togetherNeedsTwo")}</strong>
    <p>{t("fillEmptySlot")}</p>
    <div>{props.slots.map((slime, index) => !slime && <button type="button" className="secondary-button" key={index} onClick={() => props.onOpenSlot(index)}>{t("createSlot", { slot: index + 1 })}</button>)}</div>
  </section>;

  return <div className="together-culture">
    <section className="compare-input">
      <label htmlFor="compare-food">{t("compareFood")}</label>
      <div><input id="compare-food" value={props.food} maxLength={120} autoComplete="off" onChange={(event) => props.onFoodChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && props.food.trim()) props.onObserve(); }} placeholder={t("comparePlaceholder")} /><button type="button" className="primary-button" disabled={!props.food.trim()} onClick={props.onObserve}>{t("observeTogether")}</button></div>
      <p>{t("togetherReadOnly")}</p>
    </section>
    <section className="comparison-grid" aria-live="polite">
      {props.slots.map((slime, slotIndex) => {
        if (!slime) return null;
        const result = props.comparison.find((item) => item.slime.id === slime.id);
        return <article className="comparison-card" key={slime.id}>
          <header><SlimePortrait slotIndex={slotIndex} compact /><div><span>SLOT {String(slotIndex + 1).padStart(2, "0")}</span><h2>{slime.name}</h2><p>{t("learningRecordCount", { count: slime.entries.length })}</p></div></header>
          {result ? <ReactionMeter value={result.observation.value} label={t("foodReaction", { food: result.observation.food })} /> : <div className="comparison-waiting"><strong>{t("waitingObservation")}</strong><p>{t("waitingObservationHelp")}</p></div>}
        </article>;
      })}
    </section>
    {props.comparison.length === 2 && <p className="comparison-summary" role="status">{t("comparisonDifference", { value: Math.abs(props.comparison[0].observation.value - props.comparison[1].observation.value).toFixed(2) })}</p>}
  </div>;
}

function CultureJournal({ slots }: { slots: CultureNoteState["slots"] }) {
  const { t } = useI18n();
  const entries = slots.flatMap((slime, slotIndex) => slime
    ? slime.entries.map((entry) => ({ entry, slime, slotIndex }))
    : []).sort((a, b) => b.entry.trainedAt.localeCompare(a.entry.trainedAt));

  if (entries.length === 0) return <section className="empty-state journal-empty"><span>0</span><strong>{t("noJournal")}</strong><p>{t("noJournalHelp")}</p></section>;

  return <section className="journal-list" aria-label={t("journalAria")}>
    <div className="journal-summary"><span>{t("totalRecords")}</span><strong>{t("countTimes", { count: entries.length })}</strong></div>
    {entries.map(({ entry, slime, slotIndex }) => <JournalEntry key={entry.id} entry={entry} slime={slime} slotIndex={slotIndex} />)}
  </section>;
}

function JournalEntry({ entry, slime, slotIndex }: { entry: TrainingEntry; slime: Slime; slotIndex: number }) {
  const { language, t } = useI18n();
  return <article className="journal-entry">
    <div className="journal-number">{String(slotIndex + 1).padStart(2, "0")}</div>
    <header><div><span>SLOT {String(slotIndex + 1).padStart(2, "0")} · {slime.name}</span><h2>“{entry.food}”</h2></div><time dateTime={entry.trainedAt}>{formatDateTime(entry.trainedAt, language)}</time></header>
    <div className="journal-values">
      <span>{t("before")} <strong>{signedValue(entry.before)}</strong></span><i aria-hidden="true">→</i>
      <span>{t("target")} <strong>{signedValue(entry.target)}</strong></span><i aria-hidden="true">→</i>
      <span>{t("after")} <strong>{signedValue(entry.after)}</strong></span>
    </div>
  </article>;
}

export function App() {
  const [language, setLanguage] = useState<Language>(() => loadCultureNoteLanguage(window.localStorage));
  const t = createTranslator(language);
  const [view, setView] = useState<View>("single");
  const repository = useMemo(() => createBrowserCultureNoteRepository(window.localStorage), []);
  const [initial] = useState(() => {
    try {
      return {
        state: repository.load() ?? createCultureNoteState(),
        persistenceReady: true,
        storageWarning: "",
      };
    } catch {
      return {
        state: createCultureNoteState(),
        persistenceReady: false,
        storageWarning: t("storageReadFailed"),
      };
    }
  });
  const [state, setState] = useState<CultureNoteState>(initial.state);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [singleFood, setSingleFood] = useState("");
  const [target, setTarget] = useState(1);
  const [singleSession, setSingleSession] = useState<SingleSession | null>(null);
  const [memoOpen, setMemoOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [learningOpen, setLearningOpen] = useState(false);
  const [compareFood, setCompareFood] = useState("");
  const [comparison, setComparison] = useState<ComparedSlime[]>([]);
  const [storageWarning, setStorageWarning] = useState(initial.storageWarning);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t("documentTitle");
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute("content", t("documentDescription"));
  }, [language, t]);
  const commitState = (next: CultureNoteState) => {
    setState(next);
    if (!initial.persistenceReady) return;
    try {
      repository.save(next);
    } catch {
      setStorageWarning(t("storageSaveFailed"));
    }
  };

  const activeSlime = state.slots[selectedSlot];
  const currentNav = NAV_ITEMS.find((item) => item.id === view) ?? NAV_ITEMS[0];
  const openSlot = (slotIndex: number) => {
    setSelectedSlot(slotIndex);
    setView("single");
  };
  const createSlotSlime = (name: string) => {
    commitState(replaceSlot(state, selectedSlot, createSlime({ name })));
  };
  const changeSingleFood = (value: string) => {
    setSingleFood(value);
  };
  const observeSingle = () => {
    if (!activeSlime || !singleFood.trim()) return;
    const observation = observeFood(activeSlime, singleFood);
    const analysis = analyzeObservation(activeSlime, observation);
    if (singleSession?.slotId === activeSlime.id && singleSession.stage === "trained") {
      setSingleSession({ ...singleSession, stage: "verified", observation, analysis });
      return;
    }
    setSingleSession({ slotId: activeSlime.id, stage: "observed", observation, analysis, beforeTeaching: null, target: null });
    setMemoOpen(true);
  };
  const trainSingle = () => {
    if (!activeSlime || !singleSession || singleSession.slotId !== activeSlime.id) return;
    const trained = trainSlime(activeSlime, singleSession.observation, target);
    commitState(replaceSlot(state, selectedSlot, trained));
    setSingleSession({ ...singleSession, stage: "trained", beforeTeaching: singleSession.observation.value, target });
    setComparison([]);
  };
  const observeTogether = () => {
    if (!compareFood.trim() || !state.slots.every(Boolean)) return;
    setComparison(state.slots.flatMap((slime, slotIndex) => slime
      ? [{ slime, slotIndex, observation: observeFood(slime, compareFood) }]
      : []));
  };
  const closeObservationDetail = () => {
    setDetailOpen(false);
    window.requestAnimationFrame(() => document.getElementById("microscope-detail-trigger")?.focus());
  };
  const closeSettings = () => {
    setSettingsOpen(false);
    window.requestAnimationFrame(() => document.getElementById("settings-trigger")?.focus());
  };
  const changeLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    try { saveCultureNoteLanguage(window.localStorage, nextLanguage); } catch { /* The active choice still works for this session. */ }
  };
  const exportBackup = () => {
    const backup = createCultureNoteDocument(state);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `culture-note-backup-${backup.savedAt.slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };
  const resetAllData = () => {
    try {
      repository.clear();
      setState(createCultureNoteState());
      setSelectedSlot(0);
      setSingleFood("");
      setTarget(1);
      setSingleSession(null);
      setMemoOpen(false);
      setDetailOpen(false);
      setCompareFood("");
      setComparison([]);
      setStorageWarning("");
      closeSettings();
    } catch {
      setStorageWarning(t("storageResetFailed"));
    }
  };
  const closeLearning = () => {
    setLearningOpen(false);
    window.requestAnimationFrame(() => document.getElementById("learning-profile-trigger")?.focus());
  };
  const applyPhraseMix = (phraseMix: number) => {
    if (!activeSlime) return;
    const updated = { ...activeSlime, phraseMix };
    commitState(replaceSlot(state, selectedSlot, updated));
    if (singleSession?.slotId === activeSlime.id) {
      const observation = observeFood(updated, singleSession.observation.food);
      setSingleSession({ slotId: updated.id, stage: "observed", observation, analysis: analyzeObservation(updated, observation), beforeTeaching: null, target: null });
    }
    setComparison([]);
    closeLearning();
  };
  const observedSlime = singleSession
    ? state.slots.find((slime) => slime?.id === singleSession.slotId) ?? null
    : null;

  return <I18nProvider language={language}><div className="app-shell">
    <header className="topbar">
      <button type="button" className="brand" onClick={() => setView("single")}>
        <span>CULTURE NOTE · 0.1</span>
        <strong>{t("brand")}</strong>
      </button>
      <nav aria-label={t("navMain")}>
        {NAV_ITEMS.map((item) => <button
          type="button"
          key={item.id}
          className={view === item.id ? "active" : ""}
          aria-current={view === item.id ? "page" : undefined}
          onClick={() => setView(item.id)}
        >{t(item.labelKey)}</button>)}
      </nav>
    </header>

    <main className="notebook">
      <aside className="slot-rail" aria-label={t("slimeSlots")}>
        <header><span>SUBJECT</span><h2>{t("cultureSlots")}</h2></header>
        {state.slots.map((slime, slotIndex) => <button
          type="button"
          className={`slot-card${selectedSlot === slotIndex ? " selected" : ""}`}
          key={slime?.id ?? `empty-${slotIndex}`}
          aria-pressed={selectedSlot === slotIndex}
          onClick={() => openSlot(slotIndex)}
        >
          <SlimePortrait slotIndex={slotIndex} compact muted={!slime} />
          <span>SLOT {String(slotIndex + 1).padStart(2, "0")}</span>
          <strong>{slime?.name ?? t("emptySlot")}</strong>
          <small>{slime ? t("learningShort", { count: slime.entries.length }) : t("createSlimeShort")}</small>
        </button>)}
        <button id="settings-trigger" type="button" className="settings-trigger" aria-haspopup="dialog" onClick={() => setSettingsOpen(true)}><span aria-hidden="true">⚙</span> {t("settings")}</button>
      </aside>

      <section className="work-page">
        <header className="page-heading"><p className="page-index">{currentNav.code}</p><h1>{t(currentNav.labelKey)}</h1></header>
        {storageWarning && <p className="storage-warning" role="alert">{storageWarning}</p>}
        {view === "single" && (activeSlime
          ? <SingleCulture slime={activeSlime} slotIndex={selectedSlot} food={singleFood} target={target} session={singleSession} sessionSlimeName={observedSlime?.name ?? null} onFoodChange={changeSingleFood} onTargetChange={setTarget} onObserve={observeSingle} onTrain={trainSingle} onOpenLearning={() => setLearningOpen(true)} />
          : <EmptySlotForm key={selectedSlot} slotIndex={selectedSlot} onCreate={createSlotSlime} />)}
        {view === "together" && <TogetherCulture slots={state.slots} food={compareFood} comparison={comparison} onFoodChange={(value) => { setCompareFood(value); setComparison([]); }} onObserve={observeTogether} onOpenSlot={openSlot} />}
        {view === "journal" && <CultureJournal slots={state.slots} />}
      </section>
      <MicroscopeMemo
        open={memoOpen}
        slime={observedSlime}
        analysis={singleSession?.analysis ?? null}
        onToggle={() => setMemoOpen((open) => !open)}
        onOpenDetail={() => setDetailOpen(true)}
      />
    </main>
    {detailOpen && singleSession && observedSlime && <ObservationDialog slime={observedSlime} slotIndex={state.slots.findIndex((slime) => slime?.id === observedSlime.id)} analysis={singleSession.analysis} feedbackTarget={singleSession.target} onClose={closeObservationDetail} />}
    {settingsOpen && <SettingsDialog language={language} onLanguage={changeLanguage} onClose={closeSettings} onExport={exportBackup} onReset={resetAllData} />}
    {learningOpen && activeSlime && <LearningProfileDialog slime={activeSlime} onClose={closeLearning} onApply={applyPhraseMix} />}
  </div></I18nProvider>;
}
