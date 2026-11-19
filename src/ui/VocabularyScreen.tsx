import { useState } from "react";
import { masteryLevel } from "../core/scheduler";
import { formatInterval, unmarkLearned } from "../core/session";
import type { UserProfile, VocabularyWord } from "../core/types";
import { isConfigured } from "../llm/client";
import { generateWordContent } from "../llm/service";
import { makeWord } from "../storage";
import { Button, Group, LargeTitle, MasteryDots, Row, Spinner } from "./kit";

interface Props {
  words: VocabularyWord[];
  profile: UserProfile;
  onWordsChange: (w: VocabularyWord[]) => void;
}

export default function VocabularyScreen({ words, profile, onWordsChange }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const add = () => {
    const existing = new Set(words.map((w) => w.word.toLowerCase()));
    const fresh = text
      .split(/\n|,/)
      .map((l) => l.trim())
      .filter((l) => l && l.length <= 100 && !existing.has(l.toLowerCase()))
      .map((l, i) => makeWord(l, Date.now() + i));
    if (!fresh.length) {
      setError("Ці слова вже є у словнику.");
      return;
    }
    onWordsChange([...words, ...fresh]);
    setText("");
    setError(null);
  };

  /** Збагачення слів через LLM (переклад, пояснення, приклади під інтереси). */
  const generate = async (targets: VocabularyWord[]) => {
    if (!isConfigured()) {
      setError("Не налаштовано ключ LLM (файл .env).");
      return;
    }
    setError(null);
    let current = words;
    for (const w of targets) {
      setBusy(w.id);
      try {
        const c = await generateWordContent(w.word, profile, masteryLevel(w.card));
        current = current.map((x) => (x.id === w.id ? { ...x, ...c } : x));
        onWordsChange(current);
      } catch (e) {
        setError(`«${w.word}»: ${(e as Error).message}`);
      }
    }
    setBusy(null);
  };

  const remove = (id: string) => onWordsChange(words.filter((w) => w.id !== id));
  const missing = words.filter((w) => !w.translation || w.sentences.length === 0);
  const shown = words.filter((w) => w.word.toLowerCase().includes(query.toLowerCase()) || w.translation.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <LargeTitle title="Словник" subtitle={`${words.length} слів`} />

      <div className="mx-4 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Пошук"
          className="w-full h-9 rounded-[10px] bg-[#767680]/12 px-3 text-[17px] outline-none placeholder:text-[#8E8E93]"
        />
      </div>

      <Group header="Нові слова" footer="Кожне слово з нового рядка або через кому.">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={"ubiquitous\nephemeral"}
          className="w-full px-4 py-3 text-[17px] outline-none resize-none"
        />
      </Group>
      <div className="mx-4 mb-6 space-y-2.5">
        <Button onClick={add} disabled={!text.trim()}>
          Додати
        </Button>
        {missing.length > 0 && (
          <Button kind="tinted" onClick={() => generate(missing)} disabled={busy !== null}>
            {busy ? <Spinner /> : `✨ Заповнити автоматично (${missing.length})`}
          </Button>
        )}
        {error && <p className="text-[14px] text-[#FF3B30] text-center">{error}</p>}
      </div>

      {shown.length > 0 && (
        <Group header="Мої слова">
          {shown.map((w) => {
            const learned = w.learned_at !== undefined;
            const due = learned ? "вивчено" : w.card.state === 0 ? "нове" : w.card.due <= Date.now() ? "повторити зараз" : formatInterval(Math.ceil((w.card.due - Date.now()) / 86400000));
            return (
              <Row key={w.id}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{w.word}</p>
                  <p className="text-[14px] text-[#8E8E93] truncate">{w.translation || "без перекладу"}</p>
                </div>
                <div className="text-right shrink-0">
                  <MasteryDots level={learned ? 5 : masteryLevel(w.card)} />
                  <p className={`text-[12px] mt-0.5 ${learned ? "text-[#248A3D]" : "text-[#8E8E93]"}`}>{due}</p>
                </div>
                {learned && (
                  <button
                    onClick={() => onWordsChange(words.map((x) => (x.id === w.id ? unmarkLearned(x) : x)))}
                    className="text-[#007AFF] text-[17px] px-1"
                    title="Повернути в повторення"
                  >
                    ↺
                  </button>
                )}
                <button onClick={() => generate([w])} className="text-[#007AFF] text-[15px] px-1" title="Згенерувати">
                  {busy === w.id ? <Spinner /> : "✨"}
                </button>
                <button onClick={() => remove(w.id)} className="text-[#FF3B30] text-[20px] px-1" title="Видалити">
                  ⊖
                </button>
              </Row>
            );
          })}
        </Group>
      )}
    </>
  );
}
