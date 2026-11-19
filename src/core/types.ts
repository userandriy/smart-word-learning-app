// Типи предметної області навчального ядра (ЛР4, п. 3; ЛР5).

/** Етап картки, на якому користувач перейшов до наступного слова:
 *  1 – лише слово, 2 – приклади в контексті, 3 – пояснення, 4 – переклад. */
export type Stage = 1 | 2 | 3 | 4;

/** Внутрішня оцінка для FSRS: 1 – Again, 2 – Hard, 3 – Good, 4 – Easy. */
export type Grade = 1 | 2 | 3 | 4;

/** Стан картки FSRS у форматі, придатному для збереження (дати – мс). */
export interface CardState {
  due: number;
  stability: number;
  difficulty: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  /** 0 – New, 1 – Learning, 2 – Review, 3 – Relearning */
  state: number;
  last_review?: number;
}

/** Запис журналу повторень (append-only). */
export interface ReviewRecord {
  at: number;
  /** review – перехід до наступного слова; learned – слово позначено вивченим */
  kind: "review" | "learned";
  stage: Stage;
  grade?: Grade;
  /** інтервал до наступного повторення, діб */
  interval_days?: number;
}

export interface VocabularyWord {
  id: string;
  word: string;
  sentences: string[];
  explanation: string;
  translation: string;
  card: CardState;
  reviews: ReviewRecord[];
  created_at: number;
  /** момент, коли користувач довів знання реченням; після цього слово не повторюється */
  learned_at?: number;
}

export interface UserProfile {
  nativeLanguage: string;
  targetLanguage: string;
  topics: string[];
  /** нових слів на день */
  newPerDay: number;
  /** бажаний рівень утримання (0,85…0,95) */
  retention: number;
}

export const DEFAULT_PROFILE: UserProfile = {
  nativeLanguage: "uk",
  targetLanguage: "en",
  topics: [],
  newPerDay: 10,
  retention: 0.9,
};
