import { CULTURE_NOTE_PHRASE_MIX, type CultureNoteState, type Slime, type TrainingEntry } from "../domain/culture";

export const CULTURE_NOTE_STORAGE_KEY = "musaek-slime-culture-note-v1";
export const CULTURE_NOTE_FORMAT = "musaek-slime-culture-note";
export const CULTURE_NOTE_SCHEMA_VERSION = 1;

export type CultureNoteDocument = {
  format: typeof CULTURE_NOTE_FORMAT;
  schemaVersion: typeof CULTURE_NOTE_SCHEMA_VERSION;
  savedAt: string;
  state: CultureNoteState;
};

export type StorageTarget = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type CultureNoteRepository = {
  load: () => CultureNoteState | null;
  save: (state: CultureNoteState) => CultureNoteDocument;
  clear: () => void;
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => Boolean(value)
  && typeof value === "object"
  && !Array.isArray(value);

const requiredText = (value: unknown, field: string) => {
  if (typeof value !== "string" || !value.trim()) throw new CultureNoteDataError(`${field} is required.`);
  return value.trim();
};

const timestamp = (value: unknown, field: string) => {
  const result = requiredText(value, field);
  if (Number.isNaN(Date.parse(result))) throw new CultureNoteDataError(`${field} must be a timestamp.`);
  return result;
};

const finiteNumber = (value: unknown, field: string) => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new CultureNoteDataError(`${field} must be finite.`);
  return value;
};

const reaction = (value: unknown, field: string) => {
  const result = finiteNumber(value, field);
  if (result < -1 || result > 1) throw new CultureNoteDataError(`${field} must be between -1 and 1.`);
  return result;
};

const numberMap = (value: unknown, field: string) => {
  if (!isRecord(value)) throw new CultureNoteDataError(`${field} must be an object.`);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, finiteNumber(item, `${field}.${key}`)]));
};

const parseEntry = (value: unknown, index: number): TrainingEntry => {
  if (!isRecord(value)) throw new CultureNoteDataError(`entries[${index}] must be an object.`);
  if (!Array.isArray(value.tokens) || !value.tokens.every((token) => typeof token === "string")) {
    throw new CultureNoteDataError(`entries[${index}].tokens must be text.`);
  }
  return {
    id: requiredText(value.id, `entries[${index}].id`),
    trainedAt: timestamp(value.trainedAt, `entries[${index}].trainedAt`),
    food: requiredText(value.food, `entries[${index}].food`),
    tokens: [...value.tokens],
    before: reaction(value.before, `entries[${index}].before`),
    target: reaction(value.target, `entries[${index}].target`),
    after: reaction(value.after, `entries[${index}].after`),
  };
};

const parseSlime = (value: unknown, slotIndex: number): Slime | null => {
  if (value === null) return null;
  if (!isRecord(value) || !Array.isArray(value.entries)) {
    throw new CultureNoteDataError(`slots[${slotIndex}] must be a slime or null.`);
  }
  return {
    id: requiredText(value.id, `slots[${slotIndex}].id`),
    name: requiredText(value.name, `slots[${slotIndex}].name`).replace(/\s+/gu, " ").slice(0, 40),
    createdAt: timestamp(value.createdAt, `slots[${slotIndex}].createdAt`),
    bias: finiteNumber(value.bias, `slots[${slotIndex}].bias`),
    weights: numberMap(value.weights, `slots[${slotIndex}].weights`),
    phraseWeights: numberMap(value.phraseWeights, `slots[${slotIndex}].phraseWeights`),
    phraseMix: value.phraseMix === undefined
      ? CULTURE_NOTE_PHRASE_MIX
      : reaction(value.phraseMix, `slots[${slotIndex}].phraseMix`),
    entries: value.entries.map((entry, index) => parseEntry(entry, index)),
  };
};

export class CultureNoteDataError extends Error {}

export function parseCultureNoteDocument(input: unknown): CultureNoteDocument {
  const value = typeof input === "string" ? JSON.parse(input) : input;
  if (!isRecord(value) || value.format !== CULTURE_NOTE_FORMAT) {
    throw new CultureNoteDataError("This is not culture note data.");
  }
  if (value.schemaVersion !== CULTURE_NOTE_SCHEMA_VERSION) {
    throw new CultureNoteDataError("This culture note version is not supported.");
  }
  if (!isRecord(value.state) || !Array.isArray(value.state.slots) || value.state.slots.length !== 2) {
    throw new CultureNoteDataError("state.slots must contain exactly two slots.");
  }
  return {
    format: CULTURE_NOTE_FORMAT,
    schemaVersion: CULTURE_NOTE_SCHEMA_VERSION,
    savedAt: timestamp(value.savedAt, "savedAt"),
    state: {
      slots: [parseSlime(value.state.slots[0], 0), parseSlime(value.state.slots[1], 1)],
    },
  };
}

export function createCultureNoteDocument(
  state: CultureNoteState,
  savedAt = new Date().toISOString(),
): CultureNoteDocument {
  return parseCultureNoteDocument({
    format: CULTURE_NOTE_FORMAT,
    schemaVersion: CULTURE_NOTE_SCHEMA_VERSION,
    savedAt,
    state,
  });
}

export function createBrowserCultureNoteRepository(storage: StorageTarget): CultureNoteRepository {
  return {
    load() {
      const stored = storage.getItem(CULTURE_NOTE_STORAGE_KEY);
      return stored === null ? null : parseCultureNoteDocument(stored).state;
    },
    save(state) {
      const document = createCultureNoteDocument(state);
      storage.setItem(CULTURE_NOTE_STORAGE_KEY, JSON.stringify(document));
      return document;
    },
    clear() {
      storage.removeItem(CULTURE_NOTE_STORAGE_KEY);
    },
  };
}
