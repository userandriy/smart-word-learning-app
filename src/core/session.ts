import { computeGrade } from "./grade";
import { reviewCard } from "./scheduler";
import type { ReviewRecord, Stage, VocabularyWord } from "./types";

/**
 * Користувач натиснув «Далі» на етапі stage: обчислюємо оцінку,
 * оновлюємо стан FSRS і додаємо запис у журнал повторень.
 */
export function applyReview(
  word: VocabularyWord,
  stage: Stage,
  now: number,
  retention = 0.9,
): { word: VocabularyWord; record: ReviewRecord } {
  const grade = computeGrade(stage);
  const { card, intervalDays } = reviewCard(word.card, grade, now, retention);
  const record: ReviewRecord = { at: now, kind: "review", stage, grade, interval_days: intervalDays };
  return { word: { ...word, card, reviews: [...word.reviews, record] }, record };
}

/**
 * Користувач довів знання слова правильним реченням (кнопка «Вивчив»):
 * слово позначається вивченим і більше не потрапляє в чергу повторень.
 */
export function markLearned(word: VocabularyWord, stage: Stage, now: number): VocabularyWord {
  const record: ReviewRecord = { at: now, kind: "learned", stage };
  return { ...word, learned_at: now, reviews: [...word.reviews, record] };
}

/** Повернути вивчене слово в повторення (з екрана «Словник»). */
export function unmarkLearned(word: VocabularyWord): VocabularyWord {
  const { learned_at: _ignored, ...rest } = word;
  void _ignored;
  return rest;
}

/** Людиночитний інтервал: «через 3 дн.», «завтра». */
export function formatInterval(days: number): string {
  if (days <= 0) return "сьогодні";
  if (days === 1) return "завтра";
  if (days < 30) return `через ${days} дн.`;
  if (days < 365) return `через ${Math.round(days / 30)} міс.`;
  return `через ${(days / 365).toFixed(1).replace(".", ",")} р.`;
}
