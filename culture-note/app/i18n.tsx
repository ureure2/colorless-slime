import { createContext, useContext, type ReactNode } from "react";

export type Language = "ko" | "en";
export type MessageVariables = Record<string, string | number>;
export const CULTURE_NOTE_LANGUAGE_KEY = "musaek-slime-culture-note-language";

export const messages = {
  ko: {
    brand: "무색슬라임", navMain: "주요 화면", navSingle: "단독배양", navTogether: "동시배양", navJournal: "배양일지",
    documentTitle: "무색슬라임 배양 노트", documentDescription: "두 마리의 작은 AI를 가르치고 서로 다른 반응을 비교하는 배양 노트",
    settings: "설정", settingsClose: "설정 닫기", settingsLanguage: "언어", settingsLanguageHelp: "앱 화면에 사용할 언어를 선택합니다.", settingsLanguageLabel: "언어 선택", settingsKorean: "한국어", settingsEnglish: "English",
    settingsBackup: "데이터 백업", settingsBackupHelp: "두 배양 슬롯과 학습 기록을 JSON 파일로 보관합니다.", settingsBackupAction: "백업 파일 내보내기",
    settingsReset: "데이터 초기화", settingsResetHelp: "이 기기에 저장된 모든 배양 데이터를 삭제합니다.", settingsResetAction: "모든 배양 데이터 초기화", settingsResetWarning: "삭제한 데이터는 되돌릴 수 없습니다.", settingsResetConfirm: "초기화 확인", cancel: "취소",
    reactionCurrent: "현재 반응", reactionLike: "좋아함", reactionDislike: "싫어함", reactionNeutral: "중립",
    summaryPhrase: "단어 기억과 이 먹이 문구의 기억을 함께 반영했습니다.", summaryWord: "배운 단어의 영향을 사용했고, 이 먹이 문구의 기억은 아직 없습니다.", summaryDefault: "아직 배운 단어나 문구 기억이 없어 기본 반응을 보였습니다.",
    microscopeMemo: "현미경 메모", microscopeMemoClose: "현미경 메모 닫기", microscopeWaiting: "관찰을 기다리고 있어요.", microscopeWaitingHelp: "단독배양에서 먹이를 관찰하면 판단 결과가 이곳에 요약됩니다.", currentObservation: "현재 관찰", finalReaction: "최종 반응", wordSpace: "단어 공간", phraseSpace: "문구 공간", noMemory: "기억 없음", effectiveRatio: "실제 반영 비율", ratioValues: "단어 {word}% · 문구 {phrase}%", viewFullObservation: "전체 관찰기록 보기",
    saved: "저장됨", copied: "복사됨", copyFailed: "복사하지 못했습니다", observationRecord: "관찰기록", observationClose: "관찰기록 닫기", observationSummaryLabel: "관찰 결과 요약", internalValue: "내부 계산값", learnedPhrase: "직접 배운 문구", excludedCalculation: "이번 계산에서 제외",
    calcWordTitle: "단어·기호 공간", calcWordHelp: "기본 반응과 입력에 포함된 각 토큰의 영향을 더합니다.", commonBias: "공통 기준점", tokenInfluence: "‘{token}’의 영향", neverLearned: "배운 적 없음", wordSpaceValue: "단어·기호 공간의 수치",
    calcPhraseTitle: "전체 먹이 문구", calcPhraseHelp: "정규화된 전체 문구와 정확히 일치하는 기억을 확인합니다.", phraseWeight: "“{phrase}”의 문구 가중치", noMemoryExcluded: "기억 없음 · 이번 계산에서 제외",
    calcMixTitle: "반영 비율과 결합", calcMixHelp: "이번 관찰에서 실제로 사용된 두 공간의 비율입니다.", wordSymbolPercent: "단어·기호 {value}%", fullPhrasePercent: "전체 문구 {value}%",
    calcOutputTitle: "출력 변환", calcOutputHelp: "결합된 내부 값을 -1에서 +1 사이의 반응으로 바꿉니다.", analysisData: "AI용 분석 데이터", analysisDataHelp: "현재 관찰의 추론 과정을 JSON으로 내보냅니다.", save: "저장", copy: "복사",
    learningSummaryTitle: "{name}의 학습 요약", learningSummaryClose: "학습 요약 닫기", learningAmount: "학습량 요약", learningRecords: "학습 기록", learnedWords: "배운 단어", learnedPhrases: "배운 문구", countTimes: "{count}회", countItems: "{count}개", latestChange: "최근 학습 변화", targetValue: "목표 {value}", noLearnedMemory: "아직 형성된 기억이 없습니다.", memoryMix: "기억 배합", memoryMixHelp: "전체 문구를 기억한 먹이를 판단하고 학습할 때 적용됩니다.", phraseMemoryRatio: "문구 기억 반영 비율", wordCentered: "단어 중심", phraseCentered: "문구 중심", phraseFallback: "문구 기억이 없는 먹이는 단어 기억을 100% 사용합니다.", applyChanges: "변경 적용",
    slimeNameRequired: "슬라임의 이름을 입력해 주세요.", createSlime: "새 슬라임 만들기", createSlimeHelp: "이 슬롯의 학습과 기록은 다른 슬라임과 독립적으로 보관됩니다.", slimeName: "슬라임 이름", slimeNamePlaceholder: "예: 모루", startCulture: "배양 시작하기",
    learningRecordCount: "학습 기록 {count}회", memoryMixValues: "단어 {word}% · 문구 {phrase}%", adjust: "조정", prepareFood: "먹이 준비", prepareFoodHelp: "슬라임에게 보여줄 말을 자유롭게 입력하세요.", foodSentence: "먹이 문장", foodPlaceholder: "예: 맛있는 사과", observeAgain: "다시 관찰하기", observeReaction: "반응 관찰하기",
    learningComplete: "학습 기록 완료", observationResult: "관찰 결과", recentRecord: "{name}의 “{food}”에 대한 최근 기록입니다.", genericSlime: "슬라임", targetRecorded: "목표 반응 {value}을 기록했습니다.", observeAgainHelp: "같은 먹이를 다시 관찰하여 반응이 달라졌는지 확인하세요.", beforeLearning: "학습 전", afterLearning: "학습 후", teachReaction: "원하는 반응으로 가르치기", sessionOriginNotice: "이 기록은 다른 슬롯의 관찰입니다. 현재 슬롯에 먹이를 관찰시키면 새 기록으로 전환됩니다.", teachThisReaction: "이 반응 가르치기",
    togetherNeedsTwo: "동시배양에는 두 슬라임이 모두 필요합니다.", fillEmptySlot: "비어 있는 슬롯을 먼저 채워 주세요.", createSlot: "슬롯 {slot} 만들기", compareFood: "함께 관찰할 먹이 문장", comparePlaceholder: "두 슬라임에게 같은 말을 보여주세요", observeTogether: "동시에 관찰하기", togetherReadOnly: "동시배양에서는 학습하지 않고 현재 반응만 비교합니다.", foodReaction: "“{food}” 반응", waitingObservation: "관찰 대기", waitingObservationHelp: "같은 먹이를 주면 이곳에 반응이 표시됩니다.", comparisonDifference: "두 슬라임의 반응 차이는 {value}입니다.",
    noJournal: "아직 기록된 학습이 없습니다.", noJournalHelp: "단독배양에서 반응을 가르치면 이곳에 차례로 남습니다.", journalAria: "학습 기록", totalRecords: "전체 기록", before: "학습 전", target: "목표", after: "학습 후",
    storageReadFailed: "저장된 배양 기록을 읽지 못해 자동 저장을 멈췄습니다. 원본 기록은 덮어쓰지 않았습니다.", storageSaveFailed: "현재 변경 사항을 자동 저장하지 못했습니다.", storageResetFailed: "저장된 배양 데이터를 초기화하지 못했습니다. 기존 데이터는 유지됩니다.", slimeSlots: "슬라임 슬롯", cultureSlots: "배양 슬롯", emptySlot: "빈 슬롯", createSlimeShort: "슬라임 만들기", learningShort: "학습 {count}회",
  },
  en: {
    brand: "Colorless Slime", navMain: "Main views", navSingle: "Solo Culture", navTogether: "Co-Culture", navJournal: "Culture Journal",
    documentTitle: "Colorless Slime Culture Note", documentDescription: "A culture note for teaching two small AIs and comparing their different reactions.",
    settings: "Settings", settingsClose: "Close settings", settingsLanguage: "Language", settingsLanguageHelp: "Choose the language used in the app.", settingsLanguageLabel: "Language selection", settingsKorean: "한국어", settingsEnglish: "English",
    settingsBackup: "Data Backup", settingsBackupHelp: "Save both culture slots and their learning history as a JSON file.", settingsBackupAction: "Export Backup File",
    settingsReset: "Reset Data", settingsResetHelp: "Delete all culture data stored on this device.", settingsResetAction: "Reset All Culture Data", settingsResetWarning: "Deleted data cannot be recovered.", settingsResetConfirm: "Confirm Reset", cancel: "Cancel",
    reactionCurrent: "Current reaction", reactionLike: "Approach", reactionDislike: "Avoid", reactionNeutral: "Neutral",
    summaryPhrase: "Both word memory and memory of this food phrase affected the result.", summaryWord: "Learned word effects were used; this food phrase has no memory yet.", summaryDefault: "With no learned word or phrase memory, the baseline reaction was used.",
    microscopeMemo: "Microscope Note", microscopeMemoClose: "Close microscope note", microscopeWaiting: "Waiting for an observation.", microscopeWaitingHelp: "Observe food in Solo Culture to see a summary of the decision here.", currentObservation: "Current observation", finalReaction: "Final reaction", wordSpace: "Word space", phraseSpace: "Phrase space", noMemory: "No memory", effectiveRatio: "Effective ratio", ratioValues: "Words {word}% · Phrase {phrase}%", viewFullObservation: "View Full Observation",
    saved: "Saved", copied: "Copied", copyFailed: "Could not copy", observationRecord: "Observation Record", observationClose: "Close observation record", observationSummaryLabel: "Observation result summary", internalValue: "Internal value", learnedPhrase: "Learned phrase", excludedCalculation: "Excluded from this calculation",
    calcWordTitle: "Word & Symbol Space", calcWordHelp: "Adds the baseline reaction and the effect of each token in the input.", commonBias: "Shared baseline", tokenInfluence: "Effect of ‘{token}’", neverLearned: "Never learned", wordSpaceValue: "Word & symbol space value",
    calcPhraseTitle: "Full Food Phrase", calcPhraseHelp: "Checks memory for an exact match with the normalized full phrase.", phraseWeight: "Phrase weight for “{phrase}”", noMemoryExcluded: "No memory · excluded from this calculation",
    calcMixTitle: "Ratio & Combination", calcMixHelp: "The actual ratio of the two spaces used for this observation.", wordSymbolPercent: "Words & symbols {value}%", fullPhrasePercent: "Full phrase {value}%",
    calcOutputTitle: "Output Activation", calcOutputHelp: "Converts the combined internal value into a reaction from -1 to +1.", analysisData: "AI Analysis Data", analysisDataHelp: "Export the inference process for this observation as JSON.", save: "Save", copy: "Copy",
    learningSummaryTitle: "Learning Summary: {name}", learningSummaryClose: "Close learning summary", learningAmount: "Learning amount summary", learningRecords: "Learning records", learnedWords: "Learned words", learnedPhrases: "Learned phrases", countTimes: "{count}", countItems: "{count}", latestChange: "Latest Learning Change", targetValue: "Target {value}", noLearnedMemory: "No memory has formed yet.", memoryMix: "Memory Mix", memoryMixHelp: "Used to judge and learn food with a remembered full phrase.", phraseMemoryRatio: "Phrase memory ratio", wordCentered: "Word-focused", phraseCentered: "Phrase-focused", phraseFallback: "Food without phrase memory uses word memory at 100%.", applyChanges: "Apply Changes",
    slimeNameRequired: "Enter a name for the slime.", createSlime: "Create a New Slime", createSlimeHelp: "Learning and records in this slot are stored independently from the other slime.", slimeName: "Slime name", slimeNamePlaceholder: "e.g. Moru", startCulture: "Start Culture",
    learningRecordCount: "Learning records: {count}", memoryMixValues: "Words {word}% · Phrase {phrase}%", adjust: "Adjust", prepareFood: "Prepare Food", prepareFoodHelp: "Enter any words you want to show the slime.", foodSentence: "Food phrase", foodPlaceholder: "e.g. delicious apple", observeAgain: "Observe Again", observeReaction: "Observe Reaction",
    learningComplete: "Learning Recorded", observationResult: "Observation Result", recentRecord: "Latest record of {name} reacting to “{food}”.", genericSlime: "Slime", targetRecorded: "Recorded a target reaction of {value}.", observeAgainHelp: "Observe the same food again to see whether the reaction changed.", beforeLearning: "Before", afterLearning: "After", teachReaction: "Teach the desired reaction", sessionOriginNotice: "This observation belongs to another slot. Observe food with the current slot to replace it.", teachThisReaction: "Teach This Reaction",
    togetherNeedsTwo: "Co-Culture requires two slimes.", fillEmptySlot: "Fill the empty slot first.", createSlot: "Create Slot {slot}", compareFood: "Food phrase to observe together", comparePlaceholder: "Show the same words to both slimes", observeTogether: "Observe Together", togetherReadOnly: "Co-Culture only compares current reactions and does not train either slime.", foodReaction: "Reaction to “{food}”", waitingObservation: "Waiting to Observe", waitingObservationHelp: "Give both slimes the same food to show their reactions here.", comparisonDifference: "The difference between the two reactions is {value}.",
    noJournal: "No learning has been recorded yet.", noJournalHelp: "Teach a reaction in Solo Culture and it will appear here in order.", journalAria: "Learning records", totalRecords: "Total records", before: "Before", target: "Target", after: "After",
    storageReadFailed: "Saved culture records could not be read, so autosave was stopped. The original records were not overwritten.", storageSaveFailed: "The current changes could not be saved automatically.", storageResetFailed: "The saved culture data could not be reset. Existing data was kept.", slimeSlots: "Slime slots", cultureSlots: "Culture Slots", emptySlot: "Empty slot", createSlimeShort: "Create slime", learningShort: "{count} records",
  },
} as const;

export type MessageKey = keyof typeof messages.ko;
export type Translator = (key: MessageKey, variables?: MessageVariables) => string;

export function translate(language: Language, key: MessageKey, variables: MessageVariables = {}) {
  let message: string = messages[language][key];
  for (const [name, value] of Object.entries(variables)) message = message.replaceAll(`{${name}}`, String(value));
  return message;
}
export const createTranslator = (language: Language): Translator => (key, variables) => translate(language, key, variables);

const I18nContext = createContext<Language>("ko");
export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  return <I18nContext.Provider value={language}>{children}</I18nContext.Provider>;
}
export function useI18n() {
  const language = useContext(I18nContext);
  return { language, t: createTranslator(language) };
}

export function loadCultureNoteLanguage(storage: Pick<Storage, "getItem">): Language {
  try { return storage.getItem(CULTURE_NOTE_LANGUAGE_KEY) === "en" ? "en" : "ko"; } catch { return "ko"; }
}
export function saveCultureNoteLanguage(storage: Pick<Storage, "setItem">, language: Language) {
  storage.setItem(CULTURE_NOTE_LANGUAGE_KEY, language);
}
