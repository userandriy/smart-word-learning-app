import { useEffect, useState } from "react";
import { buildQueue } from "./core/queue";
import type { UserProfile, VocabularyWord } from "./core/types";
import { loadProfile, loadWords, saveProfile, saveWords } from "./storage";
import LearningScreen from "./ui/LearningScreen";
import ProfileScreen from "./ui/ProfileScreen";
import VocabularyScreen from "./ui/VocabularyScreen";

type Tab = "learn" | "words" | "profile";

export default function App() {
  const [tab, setTab] = useState<Tab>("learn");
  const [words, setWords] = useState<VocabularyWord[]>(loadWords);
  const [profile, setProfile] = useState<UserProfile>(loadProfile);
  const [session, setSession] = useState(0); // новий ключ = нова сесія навчання

  useEffect(() => saveWords(words), [words]);
  useEffect(() => saveProfile(profile), [profile]);

  const dueCount = buildQueue(words, Date.now(), { newPerDay: profile.newPerDay, reviewLimit: 100, retention: profile.retention, interleaveEvery: 5 }).length;

  const open = (t: Tab) => {
    if (t === "learn" && tab !== "learn") setSession((s) => s + 1);
    setTab(t);
  };

  return (
    <div className="min-h-dvh bg-[#F2F2F7] text-black">
      <main className="max-w-[430px] mx-auto pb-28">
        {tab === "learn" && <LearningScreen key={session} words={words} profile={profile} onWordsChange={setWords} />}
        {tab === "words" && <VocabularyScreen words={words} profile={profile} onWordsChange={setWords} />}
        {tab === "profile" && <ProfileScreen profile={profile} onChange={setProfile} />}
      </main>

      {/* Панель вкладок */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#F9F9F9]/90 backdrop-blur-xl border-t border-black/10">
        <div className="max-w-[430px] mx-auto grid grid-cols-3 pt-1.5 pb-[max(env(safe-area-inset-bottom),18px)]">
          <TabButton active={tab === "learn"} onClick={() => open("learn")} label="Навчання" badge={dueCount} icon={iconLearn} />
          <TabButton active={tab === "words"} onClick={() => open("words")} label="Словник" icon={iconWords} />
          <TabButton active={tab === "profile"} onClick={() => open("profile")} label="Профіль" icon={iconProfile} />
        </div>
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, label, icon, badge }: { active: boolean; onClick: () => void; label: string; icon: string; badge?: number }) {
  return (
    <button onClick={onClick} className={`relative flex flex-col items-center gap-0.5 ${active ? "text-[#007AFF]" : "text-[#999999]"}`}>
      <svg viewBox="0 0 24 24" className="w-[26px] h-[26px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d={icon} />
      </svg>
      <span className="text-[10px] font-medium">{label}</span>
      {badge ? (
        <span className="absolute -top-0.5 left-1/2 ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF3B30] text-white text-[11px] leading-[18px] font-semibold">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

const iconLearn = "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5M9 8h7M9 12h5";
const iconWords = "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01";
const iconProfile = "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5";
