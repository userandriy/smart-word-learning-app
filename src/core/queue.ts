import { retrievability } from "./scheduler";
import type { VocabularyWord } from "./types";

export interface QueueOptions {
  newPerDay: number;
  reviewLimit: number;
  retention: number;
  /** одна нова картка після кожних k повторень */
  interleaveEvery: number;
}

export const DEFAULT_QUEUE_OPTIONS: QueueOptions = {
  newPerDay: 10,
  reviewLimit: 100,
  retention: 0.9,
  interleaveEvery: 5,
};

function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Скільки нових слів і повторень уже виконано сьогодні (за журналом). */
export function todayCounters(words: VocabularyWord[], now: number) {
  const from = startOfDay(now);
  let newToday = 0;
  let reviewsToday = 0;
  for (const w of words) {
    const reviews = w.reviews.filter((r) => (r.kind ?? "review") === "review");
    reviews.forEach((r, i) => {
      if (r.at < from) return;
      if (i === 0) newToday++;
      else reviewsToday++;
    });
  }
  return { newToday, reviewsToday };
}

/**
 * Формує чергу сесії (ЛР4, п. 5.3). Вивчені слова (кнопка «Вивчив») не потрапляють у чергу.
 * 1) картки, час повторення яких настав, – за зростанням R (найбільший ризик забування першим);
 * 2) нові слова в межах денного ліміту;
 * 3) перемежування: одне нове слово після кожних k повторень.
 */
export function buildQueue(
  words: VocabularyWord[],
  now: number,
  opts: QueueOptions = DEFAULT_QUEUE_OPTIONS,
): VocabularyWord[] {
  const { newToday, reviewsToday } = todayCounters(words, now);
  const active = words.filter((w) => w.learned_at === undefined);

  const due = active
    .filter((w) => w.card.state !== 0 && w.card.due <= now)
    .map((w) => ({ w, r: retrievability(w.card, now, opts.retention) }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.w)
    .slice(0, Math.max(0, opts.reviewLimit - reviewsToday));

  const fresh = active
    .filter((w) => w.card.state === 0)
    .sort((a, b) => a.created_at - b.created_at)
    .slice(0, Math.max(0, opts.newPerDay - newToday));

  const queue: VocabularyWord[] = [];
  let n = 0;
  for (const w of due) {
    queue.push(w);
    if (++n % opts.interleaveEvery === 0 && fresh.length > 0) queue.push(fresh.shift()!);
  }
  return queue.concat(fresh);
}

/** Найближчий момент, коли з'явиться слово для повторення (для екрана «Усе на сьогодні»). */
export function nextDueAt(words: VocabularyWord[]): number | null {
  const learned = words.filter((w) => w.card.state !== 0 && w.learned_at === undefined).map((w) => w.card.due);
  return learned.length ? Math.min(...learned) : null;
}
