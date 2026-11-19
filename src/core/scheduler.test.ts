import { describe, expect, it } from "vitest";
import { masteryLevel, newCard, retrievability, reviewCard } from "./scheduler";
import { applyReview, markLearned, unmarkLearned } from "./session";
import { makeWord } from "../storage";

const T0 = new Date("2026-11-01T09:00:00").getTime();
const DAY = 86400000;

describe("FSRS-планувальник (FR-19)", () => {
  it("нова картка доступна одразу і має стан New", () => {
    const c = newCard(T0);
    expect(c.state).toBe(0);
    expect(c.due).toBe(T0);
    expect(retrievability(c, T0)).toBe(0);
  });

  it("вища оцінка дає довший інтервал", () => {
    const c = newCard(T0);
    const days = ([1, 2, 3, 4] as const).map((g) => reviewCard(c, g, T0).intervalDays);
    expect(days[0]).toBeLessThanOrEqual(days[1]);
    expect(days[1]).toBeLessThan(days[2]);
    expect(days[2]).toBeLessThan(days[3]);
    expect(days[0]).toBeGreaterThanOrEqual(1); // без короткострокових кроків – мінімум 1 день
  });

  it("розклад детермінований", () => {
    const a = reviewCard(newCard(T0), 3, T0);
    const b = reviewCard(newCard(T0), 3, T0);
    expect(a).toEqual(b);
  });

  it("забування (Again) збільшує лічильник lapses і скорочує інтервал", () => {
    let c = reviewCard(newCard(T0), 3, T0).card;
    c = reviewCard(c, 3, c.due).card;
    const good = reviewCard(c, 3, c.due);
    const again = reviewCard(c, 1, c.due);
    expect(again.card.lapses).toBe(c.lapses + 1);
    expect(again.intervalDays).toBeLessThan(good.intervalDays);
  });

  it("ймовірність пригадування спадає з часом і ≈ r у момент повторення", () => {
    const { card } = reviewCard(newCard(T0), 3, T0);
    const r1 = retrievability(card, T0 + DAY);
    const r2 = retrievability(card, T0 + 30 * DAY);
    expect(r1).toBeGreaterThan(r2);
    expect(retrievability(card, card.due)).toBeCloseTo(0.9, 1);
  });

  it("вищий рівень утримання дає коротші інтервали", () => {
    const c = reviewCard(newCard(T0), 3, T0).card;
    expect(reviewCard(c, 3, c.due, 0.95).intervalDays).toBeLessThan(reviewCard(c, 3, c.due, 0.85).intervalDays);
  });

  it("рівень засвоєння росте зі стабільністю", () => {
    let c = newCard(T0);
    expect(masteryLevel(c)).toBe(0);
    let t = T0;
    const levels: number[] = [];
    for (let i = 0; i < 5; i++) {
      c = reviewCard(c, 3, t).card;
      t = c.due;
      levels.push(masteryLevel(c));
    }
    expect(levels[4]).toBeGreaterThan(levels[0]);
  });
});

describe("applyReview (повний цикл картки)", () => {
  it("додає запис у журнал і зсуває дату повторення", () => {
    const w = makeWord("ubiquitous", T0);
    const { word, record } = applyReview(w, 2, T0);
    expect(record.grade).toBe(3);
    expect(record.kind).toBe("review");
    expect(word.reviews).toHaveLength(1);
    expect(word.card.due).toBeGreaterThan(T0);
    expect(w.reviews).toHaveLength(0); // вхідний об'єкт не змінюється
  });

  it("перехід на ранньому етапі дає довший інтервал, ніж після перекладу", () => {
    const w = makeWord("w", T0);
    const early = applyReview(w, 1, T0).record.interval_days!;
    const late = applyReview(w, 4, T0).record.interval_days!;
    expect(early).toBeGreaterThan(late);
  });

  it("«Вивчив» позначає слово вивченим і пише запис у журнал (FR-18)", () => {
    const w = markLearned(makeWord("w", T0), 2, T0 + 5);
    expect(w.learned_at).toBe(T0 + 5);
    expect(w.reviews.at(-1)).toMatchObject({ kind: "learned", stage: 2 });
    expect(unmarkLearned(w).learned_at).toBeUndefined();
  });
});

import { formatInterval } from "./session";
describe("formatInterval", () => {
  it.each([
    [0, "сьогодні"],
    [1, "завтра"],
    [5, "через 5 дн."],
    [60, "через 2 міс."],
    [400, "через 1,1 р."],
  ])("%i днів → %s", (d, s) => expect(formatInterval(d)).toBe(s));
});
