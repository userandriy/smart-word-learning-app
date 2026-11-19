// Збереження даних на пристрої. У прототипі – localStorage; у мобільній збірці
// цей модуль замінюється на SQLite (expo-sqlite) з тим самим інтерфейсом.
import { newCard } from "./core/scheduler";
import { DEFAULT_PROFILE, type UserProfile, type VocabularyWord } from "./core/types";

const WORDS_KEY = "swl_words";
const PROFILE_KEY = "swl_profile";

export function loadWords(): VocabularyWord[] {
  try {
    const raw = JSON.parse(localStorage.getItem(WORDS_KEY) ?? "[]") as Array<Record<string, unknown>>;
    return raw.map(migrateWord);
  } catch {
    return [];
  }
}

/** Міграція зі старого формату прототипу (mastery_level / next_review) у стан FSRS. */
function migrateWord(w: Record<string, unknown>): VocabularyWord {
  const created = Number(w.created_at ?? Date.now());
  return {
    id: String(w.id),
    word: String(w.word),
    sentences: Array.isArray(w.sentences) ? (w.sentences as string[]) : [],
    explanation: String(w.explanation ?? ""),
    translation: String(w.translation ?? ""),
    card: (w.card as VocabularyWord["card"]) ?? newCard(created),
    reviews: Array.isArray(w.reviews)
      ? (w.reviews as VocabularyWord["reviews"]).map((r) => ({ ...r, kind: r.kind ?? "review" }))
      : [],
    created_at: created,
    learned_at: typeof w.learned_at === "number" ? w.learned_at : undefined,
  };
}

export function saveWords(words: VocabularyWord[]): void {
  localStorage.setItem(WORDS_KEY, JSON.stringify(words));
}

export function loadProfile(): UserProfile {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
    return { ...DEFAULT_PROFILE, ...p };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(p: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

export function makeWord(word: string, now = Date.now()): VocabularyWord {
  return {
    id: `w_${now}_${Math.random().toString(36).slice(2, 8)}`,
    word: word.trim(),
    sentences: [],
    explanation: "",
    translation: "",
    card: newCard(now),
    reviews: [],
    created_at: now,
  };
}
