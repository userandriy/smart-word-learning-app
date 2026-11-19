import { createEmptyCard, fsrs, generatorParameters, type Card } from "ts-fsrs";
import type { CardState, Grade } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Планувальник FSRS-6 (бібліотека ts-fsrs) з бажаним рівнем утримання r. */
function scheduler(retention: number) {
  return fsrs(
    generatorParameters({
      request_retention: retention,
      maximum_interval: 36500,
      enable_fuzz: false, // детермінований розклад (потрібно для тестів)
      enable_short_term: false, // кожне повторення планується щонайменше на 1 день
    }),
  );
}

function toFsrs(c: CardState): Card {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: 0,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review !== undefined ? new Date(c.last_review) : undefined,
  } as Card;
}

function fromFsrs(c: Card): CardState {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? c.last_review.getTime() : undefined,
  };
}

/** Нова картка: доступна для вивчення одразу. */
export function newCard(now: number): CardState {
  return fromFsrs(createEmptyCard(new Date(now)));
}

/** Оновлює стан картки після повторення з оцінкою grade. */
export function reviewCard(
  card: CardState,
  grade: Grade,
  now: number,
  retention = 0.9,
): { card: CardState; intervalDays: number } {
  const res = scheduler(retention).next(toFsrs(card), new Date(now), grade);
  const next = fromFsrs(res.card);
  return { card: next, intervalDays: Math.round((next.due - now) / DAY_MS) };
}

/** Ймовірність пригадування R у момент now (для нової картки – 0). */
export function retrievability(card: CardState, now: number, retention = 0.9): number {
  if (card.state === 0) return 0;
  return scheduler(retention).get_retrievability(toFsrs(card), new Date(now), false);
}

/** Рівень засвоєння 0–5 для відображення (за стабільністю S, діб). */
export function masteryLevel(card: CardState): number {
  if (card.state === 0) return 0;
  const s = card.stability;
  if (s < 2) return 1;
  if (s < 7) return 2;
  if (s < 21) return 3;
  if (s < 90) return 4;
  return 5;
}
