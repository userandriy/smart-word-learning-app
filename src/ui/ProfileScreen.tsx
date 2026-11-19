import { useState } from "react";
import type { UserProfile } from "../core/types";
import { LANGUAGES } from "../llm/service";
import { Group, LargeTitle, Row } from "./kit";

const SUGGESTED = ["ІТ", "Розробка ігор", "Маркетинг", "Медицина", "Data Science", "Подорожі", "Музика", "Бізнес", "Психологія", "Право"];

export default function ProfileScreen({ profile, onChange }: { profile: UserProfile; onChange: (p: UserProfile) => void }) {
  const [topic, setTopic] = useState("");
  const set = <K extends keyof UserProfile>(k: K, v: UserProfile[K]) => onChange({ ...profile, [k]: v });
  const addTopic = (t: string) => {
    const s = t.trim();
    if (s && !profile.topics.includes(s) && profile.topics.length < 10) set("topics", [...profile.topics, s]);
    setTopic("");
  };

  const select = (k: "nativeLanguage" | "targetLanguage") => (
    <select
      value={profile[k]}
      onChange={(e) => set(k, e.target.value)}
      className="bg-transparent text-[17px] text-[#8E8E93] text-right outline-none appearance-none"
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.name}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <LargeTitle title="Профіль" />

      <Group header="Мови">
        <Row>
          <span className="flex-1">Вивчаю</span>
          {select("targetLanguage")}
        </Row>
        <Row>
          <span className="flex-1">Рідна мова</span>
          {select("nativeLanguage")}
        </Row>
      </Group>

      <Group header="Інтереси" footer="Приклади вживання слів генеруються на ці теми.">
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {profile.topics.map((t) => (
            <button key={t} onClick={() => set("topics", profile.topics.filter((x) => x !== t))} className="px-3 h-8 rounded-full bg-[#007AFF] text-white text-[15px]">
              {t} ✕
            </button>
          ))}
          {SUGGESTED.filter((t) => !profile.topics.includes(t)).map((t) => (
            <button key={t} onClick={() => addTopic(t)} className="px-3 h-8 rounded-full bg-[#767680]/12 text-[15px]">
              {t}
            </button>
          ))}
        </div>
        <Row>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTopic(topic)}
            placeholder="Своя тема…"
            className="flex-1 outline-none"
          />
          {topic.trim() && (
            <button onClick={() => addTopic(topic)} className="text-[#007AFF]">
              Додати
            </button>
          )}
        </Row>
      </Group>

      <Group header="Навчання" footer="Вищий рівень утримання означає частіші повторення.">
        <Row>
          <span className="flex-1">Нових слів на день</span>
          <div className="flex items-center rounded-[8px] bg-[#767680]/12 overflow-hidden">
            <button onClick={() => set("newPerDay", Math.max(0, profile.newPerDay - 5))} className="w-11 h-8 text-[20px]">
              −
            </button>
            <span className="w-8 text-center text-[17px]">{profile.newPerDay}</span>
            <button onClick={() => set("newPerDay", Math.min(50, profile.newPerDay + 5))} className="w-11 h-8 text-[20px]">
              +
            </button>
          </div>
        </Row>
        <div className="px-4 py-3">
          <p className="mb-2">Рівень утримання</p>
          <div className="grid grid-cols-3 p-[2px] rounded-[9px] bg-[#767680]/12">
            {[0.85, 0.9, 0.95].map((r) => (
              <button
                key={r}
                onClick={() => set("retention", r)}
                className={`h-8 rounded-[7px] text-[15px] ${profile.retention === r ? "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] font-semibold" : ""}`}
              >
                {Math.round(r * 100)} %
              </button>
            ))}
          </div>
        </div>
      </Group>
    </>
  );
}
