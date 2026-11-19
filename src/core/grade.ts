import type { Grade, Stage } from "./types";

/**
 * Внутрішня оцінка для FSRS за етапом, на якому користувач натиснув «Далі».
 * Чим раніше користувач перейшов до наступного слова, тим краще він його пам'ятає
 * і тим довшим буде інтервал (ЛР4, п. 5.2).
 *   1 – лише слово       → Easy  (4)
 *   2 – контекст         → Good  (3)
 *   3 – пояснення        → Hard  (2)
 *   4 – переклад         → Again (1)
 */
export function computeGrade(stage: Stage): Grade {
  return (5 - stage) as Grade;
}
