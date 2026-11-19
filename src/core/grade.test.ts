import { describe, expect, it } from "vitest";
import { computeGrade } from "./grade";
import type { Grade, Stage } from "./types";

// Контрольні тести: етап, на якому натиснуто «Далі» → внутрішня оцінка FSRS (FR-17)
const cases: [string, Stage, Grade][] = [
  ["T1", 1, 4],
  ["T2", 2, 3],
  ["T3", 3, 2],
  ["T4", 4, 1],
];

describe("computeGrade", () => {
  it.each(cases)("%s: «Далі» на етапі %i → оцінка %i", (_n, stage, expected) => {
    expect(computeGrade(stage)).toBe(expected);
  });

  it("що раніше перехід, то вища оцінка", () => {
    expect(computeGrade(1)).toBeGreaterThan(computeGrade(2));
    expect(computeGrade(2)).toBeGreaterThan(computeGrade(3));
    expect(computeGrade(3)).toBeGreaterThan(computeGrade(4));
  });
});
