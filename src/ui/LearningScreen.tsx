import { useMemo, useState } from "react";
import { buildQueue, nextDueAt, todayCounters } from "../core/queue";
import { applyReview, formatInterval, markLearned } from "../core/session";
import type { Stage, UserProfile, VocabularyWord } from "../core/types";
import { validateSentence, type Verdict } from "../llm/service";
import { Button, LargeTitle, Sheet, Spinner } from "./kit";

/** Сторінки картки: що показується і яка кнопка веде на наступну. */
const PAGES: Record<Stage, { title: string; nextLabel?: string }> = {
  1: { title: "Слово", nextLabel: "У контексті" },
  2: { title: "Контекст", nextLabel: "Пояснення" },
  3: { title: "Пояснення", nextLabel: "Переклад" },
  4: { title: "Переклад" },
};

interface Props {
  words: VocabularyWord[];
  profile: UserProfile;
  onWordsChange: (w: VocabularyWord[]) => void;
}

export default function LearningScreen({ words, profile, onWordsChange }: Props) {
  // Черга формується на початку сесії
  const [queueIds, setQueueIds] = useState<string[]>(() =>
    buildQueue(words, Date.now(), { newPerDay: profile.newPerDay, reviewLimit: 100, retention: profile.retention, interleaveEvery: 5 }).map((w) => w.id),
  );
  const [pos, setPos] = useState(0);
  const [stage, setStage] = useState<Stage>(1);
  const [toast, setToast] = useState<string | null>(null);

  // аркуш «Вивчив»
  const [sheet, setSheet] = useState(false);
  const [sentence, setSentence] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);
  const current = pos < queueIds.length ? byId.get(queueIds[pos]) : undefined;

  const goNext = () => {
    setPos((p) => p + 1);
    setStage(1);
    setSheet(false);
    setSentence("");
    setVerdict(null);
    setError(null);
  };

  /** «Далі»: застосунок запам'ятовує етап і планує наступний показ слова. */
  const next = () => {
    if (!current) return;
    const { word, record } = applyReview(current, stage, Date.now(), profile.retention);
    onWordsChange(words.map((w) => (w.id === word.id ? word : w)));
    // якщо знадобився переклад – слово ще раз у кінці цієї сесії
    if (stage === 4 && queueIds.indexOf(word.id) === pos) setQueueIds((q) => [...q, word.id]);
    setToast(`«${current.word}» – наступний показ ${formatInterval(record.interval_days ?? 0)}`);
    goNext();
  };

  /** «Вивчив»: слово більше не показується, якщо речення правильне. */
  const finishLearned = () => {
    if (!current) return;
    onWordsChange(words.map((w) => (w.id === current.id ? markLearned(current, stage, Date.now()) : w)));
    setToast(`«${current.word}» позначено як вивчене`);
    goNext();
  };

  const check = async () => {
    if (!current || !sentence.trim()) return;
    setChecking(true);
    setError(null);
    try {
      setVerdict(await validateSentence(sentence, current.word, profile));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  };

  if (words.length === 0) {
    return (
      <>
        <LargeTitle title="Навчання" />
        <Empty icon="📚" title="Словник порожній" text="Додайте слова на вкладці «Словник», щоб почати." />
      </>
    );
  }

  if (!current) {
    const { newToday, reviewsToday } = todayCounters(words, Date.now());
    const due = nextDueAt(words);
    return (
      <>
        <LargeTitle title="Навчання" subtitle={`Сьогодні: ${newToday} нових · ${reviewsToday} повторень`} />
        <Empty
          icon="✅"
          title="Усе на сьогодні"
          text={due ? `Наступне слово з'явиться ${new Date(due).toLocaleString("uk-UA", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}.` : "Додайте нові слова у словник."}
        />
        {toast && <p className="text-center text-[13px] text-[#8E8E93] -mt-4">{toast}</p>}
      </>
    );
  }

  return (
    <>
      <LargeTitle title="Навчання" />

      {/* Прогрес сесії і «Далі» */}
      <div className="mx-5 mb-3 flex items-center gap-3">
        <span className="text-[15px] text-[#8E8E93] tabular-nums">
          {pos + 1} / {queueIds.length}
        </span>
        <div className="flex-1 h-[4px] rounded-full bg-[#E5E5EA] overflow-hidden">
          <div className="h-full bg-[#007AFF] transition-all" style={{ width: `${((pos + 1) / queueIds.length) * 100}%` }} />
        </div>
        <button onClick={next} className="text-[17px] text-[#007AFF] font-medium active:opacity-60">
          Далі →
        </button>
      </div>

      {/* Картка-сторінка */}
      <div className="mx-4 bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-5 pt-4 pb-5 min-h-[420px] flex flex-col">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[#8E8E93]">
            Сторінка {stage} з 4 · {PAGES[stage].title}
          </span>
          <button onClick={() => setSheet(true)} className="px-3 h-[30px] rounded-full bg-[#34C759]/15 text-[#248A3D] text-[15px] font-semibold active:opacity-60">
            Вивчив
          </button>
        </div>

        <h2 className="text-center text-[40px] leading-tight font-bold tracking-tight mt-8">{current.word}</h2>

        <div className="mt-6 flex-1">
          {stage === 1 && <p className="text-center text-[15px] text-[#8E8E93]">Пам'ятаєте це слово?</p>}

          {stage === 2 &&
            (current.sentences.length ? (
              <div className="space-y-2.5">
                {current.sentences.map((s, i) => (
                  <p key={i} className="text-[16px] leading-snug bg-[#F2F2F7] rounded-[12px] px-3.5 py-2.5">
                    {highlight(s, current.word)}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[15px] text-[#8E8E93] text-center">Приклади ще не згенеровано (вкладка «Словник»).</p>
            ))}

          {stage === 3 && (
            <p className="text-[17px] leading-snug bg-[#FFF8E6] rounded-[12px] px-4 py-3">
              {current.explanation || <span className="text-[#8E8E93]">Пояснення ще не згенеровано.</span>}
            </p>
          )}

          {stage === 4 && (
            <p className="text-[22px] font-semibold text-center bg-[#34C759]/10 text-[#1E7B34] rounded-[12px] px-4 py-4">
              {current.translation || "—"}
            </p>
          )}
        </div>

        <div className="mt-5">
          {stage < 4 ? (
            <Button onClick={() => setStage((s) => (s + 1) as Stage)}>{PAGES[stage].nextLabel}</Button>
          ) : (
            <Button kind="green" onClick={next}>
              Наступне слово →
            </Button>
          )}
        </div>
      </div>

      {/* Індикатор сторінок */}
      <div className="flex justify-center gap-2 mt-4">
        {([1, 2, 3, 4] as Stage[]).map((s) => (
          <span key={s} className={`w-[7px] h-[7px] rounded-full ${s === stage ? "bg-[#007AFF]" : "bg-[#C7C7CC]"}`} />
        ))}
      </div>
      {toast && <p className="text-center text-[13px] text-[#8E8E93] mt-3 px-6">{toast}</p>}

      {/* Доведення знання слова */}
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Доведіть, що знаєте">
        <p className="text-[15px] text-[#3C3C43] px-1">
          Вживіть <b>{current.word}</b> у реченні. Якщо речення правильне, слово більше не буде показуватись.
        </p>
        <textarea
          value={sentence}
          onChange={(e) => {
            setSentence(e.target.value);
            if (verdict && !verdict.correct) setVerdict(null);
          }}
          rows={3}
          maxLength={300}
          placeholder="Ваше речення…"
          className="w-full bg-white rounded-[12px] px-3.5 py-3 text-[17px] outline-none resize-none"
        />
        {error && <p className="text-[14px] text-[#FF3B30] px-1">{error}</p>}
        {verdict && (
          <div className={`rounded-[12px] px-3.5 py-3 text-[15px] ${verdict.correct ? "bg-[#34C759]/12 text-[#1E7B34]" : "bg-[#FF3B30]/10 text-[#B42318]"}`}>
            <p className="font-semibold mb-0.5">{verdict.correct ? "Правильно" : "Є помилка"}</p>
            <p>{verdict.message}</p>
            {!verdict.correct && verdict.corrected && <p className="mt-1.5 text-[#3C3C43]">Варіант: {verdict.corrected}</p>}
          </div>
        )}
        {verdict?.correct ? (
          <Button kind="green" onClick={finishLearned}>
            Готово, слово вивчене
          </Button>
        ) : (
          <Button onClick={check} disabled={!sentence.trim() || checking}>
            {checking ? <Spinner /> : verdict ? "Перевірити ще раз" : "Перевірити"}
          </Button>
        )}
      </Sheet>
    </>
  );
}

function highlight(text: string, word: string) {
  const stem = word.length > 4 ? word.slice(0, -2) : word;
  const i = text.toLowerCase().indexOf(stem.toLowerCase());
  if (i < 0) return text;
  const end = text.slice(i).search(/[^\p{L}-]/u);
  const j = end < 0 ? text.length : i + end;
  return (
    <>
      {text.slice(0, i)}
      <b className="text-[#007AFF] font-semibold">{text.slice(i, j)}</b>
      {text.slice(j)}
    </>
  );
}

function Empty({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="text-center px-10 pt-20 pb-10">
      <div className="text-[56px] mb-3">{icon}</div>
      <h2 className="text-[22px] font-bold mb-1">{title}</h2>
      <p className="text-[15px] text-[#8E8E93]">{text}</p>
    </div>
  );
}
