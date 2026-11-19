import { describe, expect, it } from "vitest";
import { buildQueue, nextDueAt, todayCounters } from "./queue";
import { applyReview, markLearned } from "./session";
import { makeWord } from "../storage";
import type { VocabularyWord } from "./types";

const T0 = new Date("2026-11-01T09:00:00").getTime();
const DAY = 86400000;
const opts = { newPerDay: 3, reviewLimit: 100, retention: 0.9, interleaveEvery: 2 };

/** Слово, вивчене в момент at з оцінкою Good. */
function learned(name: string, at: number): VocabularyWord {
  return applyReview(makeWord(name, at - 1000), 2, at).word;
}

describe("buildQueue (FR-12)", () => {
  it("порожній словник → порожня черга", () => {
    expect(buildQueue([], T0, opts)).toEqual([]);
  });

  it("нові слова обмежуються денним лімітом у порядку додавання", () => {
    const words = ["a", "b", "c", "d", "e"].map((x, i) => makeWord(x, T0 + i));
    expect(buildQueue(words, T0 + 10, opts).map((w) => w.word)).toEqual(["a", "b", "c"]);
  });

  it("слова, вивчені сьогодні, зменшують ліміт нових", () => {
    const words = [learned("old", T0), makeWord("x", T0 + 1), makeWord("y", T0 + 2), makeWord("z", T0 + 3)];
    expect(todayCounters(words, T0 + 100).newToday).toBe(1);
    expect(buildQueue(words, T0 + 100, opts).map((w) => w.word)).toEqual(["x", "y"]);
  });

  it("у черзі лише ті повторення, час яких настав, – спершу з меншою R", () => {
    const longAgo = learned("long-ago", T0 - 40 * DAY);
    const recent = learned("recent", T0 - 4 * DAY);
    const notDue = learned("fresh", T0 - 60_000);
    const now = T0 + 2 * DAY;
    const q = buildQueue([recent, notDue, longAgo], now, { ...opts, newPerDay: 0 });
    expect(q.map((w) => w.word)).toEqual(["long-ago", "recent"]);
  });

  it("нові слова перемежовуються з повтореннями (k = 2)", () => {
    const old = ["r1", "r2", "r3", "r4"].map((x, i) => learned(x, T0 - (20 + i) * DAY));
    const fresh = ["n1", "n2"].map((x, i) => makeWord(x, T0 + i));
    const q = buildQueue([...old, ...fresh], T0 + DAY, opts).map((w) => w.word);
    expect(q.length).toBe(6);
    expect(q[2]).toMatch(/^n/);
    expect(q[5]).toMatch(/^n/);
  });

  it("ліміт повторень на день", () => {
    const old = Array.from({ length: 8 }, (_, i) => learned(`r${i}`, T0 - 30 * DAY));
    expect(buildQueue(old, T0, { ...opts, reviewLimit: 5 }).length).toBe(5);
  });

  it("вивчені слова не потрапляють у чергу (FR-18)", () => {
    const a = learned("a", T0 - 30 * DAY);
    const b = markLearned(learned("b", T0 - 30 * DAY), 1, T0 - DAY);
    const c = markLearned(makeWord("c", T0), 1, T0);
    expect(buildQueue([a, b, c], T0, opts).map((w) => w.word)).toEqual(["a"]);
  });

  it("nextDueAt повертає найближчу дату або null", () => {
    expect(nextDueAt([makeWord("a", T0)])).toBeNull();
    const w = learned("a", T0);
    expect(nextDueAt([w])).toBe(w.card.due);
  });
});
