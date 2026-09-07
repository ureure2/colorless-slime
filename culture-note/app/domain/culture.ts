export const CULTURE_NOTE_SLOT_COUNT = 2;
export const CULTURE_NOTE_PHRASE_MIX = 0.35;
export const CULTURE_NOTE_LEARNING_RATE = 0.12;

export type TrainingEntry = {
  id: string;
  trainedAt: string;
  food: string;
  tokens: string[];
  before: number;
  target: number;
  after: number;
};

export type Slime = {
  id: string;
  name: string;
  createdAt: string;
  bias: number;
  weights: Record<string, number>;
  phraseWeights: Record<string, number>;
  phraseMix: number;
  entries: TrainingEntry[];
};

export type CultureNoteState = {
  slots: [Slime | null, Slime | null];
};

export type Observation = {
  food: string;
  phraseKey: string;
  tokens: string[];
  value: number;
};

export type TokenInfluence = {
  token: string;
  count: number;
  known: boolean;
  weight: number;
  total: number;
};

export type ObservationAnalysis = {
  observation: Observation;
  bias: number;
  tokenInfluences: TokenInfluence[];
  wordRaw: number;
  phraseKnown: boolean;
  phraseRaw: number;
  wordRatio: number;
  phraseRatio: number;
  combinedRaw: number;
  output: number;
};

type TrainingOptions = {
  id?: () => string;
  now?: () => string;
};

const symbolSegmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });

const clampReaction = (value: number, field: string) => {
  if (!Number.isFinite(value)) throw new TypeError(`${field} must be a finite number.`);
  return Math.max(-1, Math.min(1, value));
};

const uid = () => globalThis.crypto?.randomUUID?.()
  ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const normalizePhrase = (food: string) => food
  .normalize("NFKC")
  .trim()
  .replace(/\s+/gu, " ")
  .toLocaleLowerCase("ko-KR");

export function tokenize(food: string): string[] {
  const normalized = food.normalize("NFKC").toLocaleLowerCase("ko-KR").replaceAll("…", "...");
  const chunks = normalized.match(/[\p{L}\p{M}\p{N}]+|\.+|[^\p{L}\p{M}\p{N}\s.]+/gu) ?? [];
  return chunks.flatMap((chunk) => {
    if (/^[\p{L}\p{M}\p{N}]+$/u.test(chunk)) return [chunk];
    if (/^\.+$/.test(chunk)) {
      if (chunk.length === 1) return ["."];
      if (chunk.length === 2) return [".."];
      return ["…", ...Array(chunk.length - 3).fill("…+")];
    }
    return [...symbolSegmenter.segment(chunk)].map((part) => part.segment);
  });
}

export const createCultureNoteState = (): CultureNoteState => ({ slots: [null, null] });

export function createSlime(options: { id?: string; name: string; createdAt?: string }): Slime {
  const name = options.name.trim().replace(/\s+/gu, " ").slice(0, 40);
  if (!name) throw new TypeError("name must not be empty.");
  return {
    id: options.id ?? uid(),
    name,
    createdAt: options.createdAt ?? new Date().toISOString(),
    bias: 0,
    weights: {},
    phraseWeights: {},
    phraseMix: CULTURE_NOTE_PHRASE_MIX,
    entries: [],
  };
}

function calculateReaction(slime: Slime, tokens: string[], phraseKey: string) {
  const wordRaw = tokens.reduce((sum, token) => sum + (slime.weights[token] ?? 0), slime.bias);
  const phraseKnown = Object.prototype.hasOwnProperty.call(slime.phraseWeights, phraseKey);
  const phraseRaw = phraseKnown ? slime.phraseWeights[phraseKey] : 0;
  const configuredPhraseMix = Number.isFinite(slime.phraseMix)
    ? Math.max(0, Math.min(1, slime.phraseMix))
    : CULTURE_NOTE_PHRASE_MIX;
  const phraseRatio = phraseKnown ? configuredPhraseMix : 0;
  const wordRatio = 1 - phraseRatio;
  const combinedRaw = wordRaw * wordRatio + phraseRaw * phraseRatio;
  return { wordRaw, phraseKnown, phraseRaw, wordRatio, phraseRatio, combinedRaw };
}

export function observeFood(slime: Slime, food: string): Observation {
  const normalizedFood = food.trim();
  const tokens = tokenize(normalizedFood);
  if (!normalizedFood || tokens.length === 0) throw new TypeError("food must contain at least one token.");
  const phraseKey = normalizePhrase(normalizedFood);
  const calculation = calculateReaction(slime, tokens, phraseKey);
  return {
    food: normalizedFood,
    phraseKey,
    tokens,
    value: Math.tanh(calculation.combinedRaw),
  };
}

export function analyzeObservation(slime: Slime, observation: Observation): ObservationAnalysis {
  const counts = observation.tokens.reduce<Record<string, number>>((all, token) => {
    all[token] = (all[token] ?? 0) + 1;
    return all;
  }, {});
  const tokenInfluences = Object.entries(counts).map(([token, count]) => {
    const known = Object.prototype.hasOwnProperty.call(slime.weights, token);
    const weight = slime.weights[token] ?? 0;
    return { token, count, known, weight, total: weight * count };
  });
  const calculation = calculateReaction(slime, observation.tokens, observation.phraseKey);
  return {
    observation: { ...observation, tokens: [...observation.tokens] },
    bias: slime.bias,
    tokenInfluences,
    ...calculation,
    output: Math.tanh(calculation.combinedRaw),
  };
}

export function trainSlime(
  slime: Slime,
  observation: Observation,
  target: number,
  options: TrainingOptions = {},
): Slime {
  const normalizedTarget = clampReaction(target, "target");
  const before = Math.tanh(calculateReaction(slime, observation.tokens, observation.phraseKey).combinedRaw);
  const signal = 2 * (normalizedTarget - before) * (1 - before * before) * CULTURE_NOTE_LEARNING_RATE;
  const phraseMix = Number.isFinite(slime.phraseMix)
    ? Math.max(0, Math.min(1, slime.phraseMix))
    : CULTURE_NOTE_PHRASE_MIX;
  const wordRatio = 1 - phraseMix;
  const counts = observation.tokens.reduce<Record<string, number>>((all, token) => {
    all[token] = (all[token] ?? 0) + 1;
    return all;
  }, {});
  const weights = { ...slime.weights };
  Object.entries(counts).forEach(([token, count]) => {
    weights[token] = (weights[token] ?? 0) + signal * wordRatio * count;
  });

  const phraseWasKnown = Object.prototype.hasOwnProperty.call(slime.phraseWeights, observation.phraseKey);
  const oldPhraseWeight = phraseWasKnown
    ? slime.phraseWeights[observation.phraseKey]
    : observation.tokens.reduce((sum, token) => sum + (slime.weights[token] ?? 0), slime.bias);
  const phraseWeights = {
    ...slime.phraseWeights,
    [observation.phraseKey]: oldPhraseWeight + signal * phraseMix,
  };
  const next = {
    ...slime,
    bias: slime.bias + signal * wordRatio,
    weights,
    phraseWeights,
  };
  const after = observeFood(next, observation.food).value;
  const entry: TrainingEntry = {
    id: (options.id ?? uid)(),
    trainedAt: (options.now ?? (() => new Date().toISOString()))(),
    food: observation.food,
    tokens: [...observation.tokens],
    before,
    target: normalizedTarget,
    after,
  };
  return { ...next, entries: [entry, ...slime.entries] };
}
