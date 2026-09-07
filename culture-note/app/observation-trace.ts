import { CULTURE_NOTE_PHRASE_MIX, type ObservationAnalysis, type Slime } from "./domain/culture";

export const OBSERVATION_TRACE_FORMAT = "musaek-observation-trace";
export const OBSERVATION_TRACE_VERSION = 1;

const interpretation = (value: number) => value > 0.15
  ? "positive"
  : value < -0.15 ? "negative" : "neutral";

export function createObservationTrace(options: {
  slime: Slime;
  slotIndex: number;
  analysis: ObservationAnalysis;
  feedbackTarget?: number | null;
  generatedAt?: string;
}) {
  const { slime, slotIndex, analysis } = options;
  const configuredPhraseMix = Number.isFinite(slime.phraseMix)
    ? Math.max(0, Math.min(1, slime.phraseMix))
    : CULTURE_NOTE_PHRASE_MIX;
  return {
    trace_format: OBSERVATION_TRACE_FORMAT,
    version: OBSERVATION_TRACE_VERSION,
    mode: "inference",
    generated_at: options.generatedAt ?? new Date().toISOString(),
    engine: { name: "musaek-culture-note", version: 1, activation: "tanh" },
    dimensions: 1,
    axes: ["reaction"],
    subject: { id: slime.id, name: slime.name, slot: slotIndex + 1 },
    source: { type: "single_observation", state: "current" },
    input: {
      food: analysis.observation.food,
      phrase_key: analysis.observation.phraseKey,
      tokens: [...analysis.observation.tokens],
    },
    stages: [{
      id: "word_space",
      type: "weighted_sum",
      shape: [1],
      bias: [analysis.bias],
      contributions: analysis.tokenInfluences.map((item) => ({
        key: item.token,
        count: item.count,
        weight: [item.weight],
        result: [item.total],
      })),
      output: [analysis.wordRaw],
    }, {
      id: "phrase_space",
      type: "lookup",
      shape: [1],
      key: analysis.observation.phraseKey,
      known: analysis.phraseKnown,
      output: analysis.phraseKnown ? [analysis.phraseRaw] : null,
    }, {
      id: "space_mix",
      type: "weighted_sum",
      inputs: ["word_space", "phrase_space"],
      configured_ratio: { word_space: Number((1 - configuredPhraseMix).toFixed(12)), phrase_space: configuredPhraseMix },
      effective_ratio: { word_space: analysis.wordRatio, phrase_space: analysis.phraseRatio },
      output: [analysis.combinedRaw],
    }, {
      id: "output_activation",
      type: "tanh",
      input: [analysis.combinedRaw],
      output: [analysis.output],
    }],
    final_output: {
      value: [analysis.output],
      interpretation: [interpretation(analysis.output)],
      range: [-1, 1],
    },
    feedback_reference: options.feedbackTarget === null || options.feedbackTarget === undefined
      ? null
      : { target: [options.feedbackTarget], used_during_inference: false },
  };
}

export function observationTraceFilename(slime: Slime, generatedAt: string) {
  const safeName = slime.name.normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "") || "slime";
  return `observation-trace-${safeName}-${generatedAt.slice(0, 10)}.json`;
}
