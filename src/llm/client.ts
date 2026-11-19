/**
 * Клієнт OpenAI-сумісного API (Chat Completions).
 * Провайдер задається лише конфігурацією: base URL, ключ, модель (ЛР6, FR-28).
 * У прототипі запит іде з клієнта; у цільовій архітектурі цей самий інтерфейс
 * реалізує серверний LLM-шлюз, і ключ не потрапляє на пристрій (ЛР4, рис. 3).
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export type ChatFn = (
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number; json?: boolean },
) => Promise<string>;

const env = import.meta.env ?? {};

/** Типові адреси OpenAI-сумісних кінцевих точок відомих провайдерів. */
const KNOWN_BASE_URLS: Record<string, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
};

export function readConfig(): LlmConfig {
  const provider = (env.VITE_AI_PROVIDER as string) || "openrouter";
  const baseUrl = (env.VITE_LLM_BASE_URL as string) || KNOWN_BASE_URLS[provider] || KNOWN_BASE_URLS.openrouter;
  // сумісність зі старими змінними .env прототипу
  const apiKey =
    (env.VITE_LLM_API_KEY as string) ||
    (provider === "gemini" ? (env.VITE_GEMINI_API_KEY as string) : (env.VITE_OPENROUTER_API_KEY as string)) ||
    "";
  const model =
    (env.VITE_LLM_MODEL as string) ||
    (provider === "gemini" ? (env.VITE_GEMINI_MODEL as string) || "gemini-2.0-flash" : "") ||
    (env.VITE_OPENROUTER_MODEL as string) ||
    "mistralai/mistral-7b-instruct:free";
  return { provider, baseUrl, apiKey, model };
}

export function isConfigured(cfg: LlmConfig = readConfig()): boolean {
  return cfg.provider === "mock" || (cfg.apiKey !== "" && !cfg.apiKey.startsWith("your-"));
}

export function createChat(cfg: LlmConfig = readConfig()): ChatFn {
  if (cfg.provider === "mock") return mockChat;
  return async (messages, opts = {}) => {
    if (!isConfigured(cfg)) throw new Error("Не налаштовано ключ LLM. Вкажіть VITE_LLM_API_KEY у файлі .env");
    const body: Record<string, unknown> = {
      model: cfg.model,
      messages,
      temperature: opts.temperature ?? 0.7,
      // запас на «міркування» моделей з thinking (Gemini 2.5+/3): інакше JSON обрізається
      max_tokens: opts.maxTokens ?? 2048,
    };
    // режим JSON підтримують OpenAI та Gemini; у безкоштовних моделей OpenRouter може бути відсутній
    if (opts.json && JSON_MODE_PROVIDERS.has(cfg.provider)) body.response_format = { type: "json_object" };
    // для Gemini обмежуємо міркування, щоб відповідь була швидкою і вкладалась у ліміт токенів
    if (cfg.provider === "gemini") body.reasoning_effort = (env.VITE_LLM_REASONING_EFFORT as string) || "low";

    let res = await post(cfg, body);
    if (res.status === 400 && (body.reasoning_effort || body.response_format)) {
      // модель не підтримує додаткові параметри – повторюємо базовий запит
      delete body.reasoning_effort;
      delete body.response_format;
      res = await post(cfg, body);
    }
    if (!res.ok) throw new Error(`Помилка LLM (${res.status}): ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const choice = data.choices?.[0];
    const raw = choice?.message?.content;
    const content = (Array.isArray(raw) ? raw.map((p: { text?: string }) => p.text ?? "").join("") : String(raw ?? "")).trim();
    if (!content && choice?.finish_reason === "length") {
      throw new Error("відповідь моделі обрізана лімітом токенів");
    }
    return content;
  };
}

const JSON_MODE_PROVIDERS = new Set(["openai", "gemini"]);

async function post(cfg: LlmConfig, body: Record<string, unknown>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    return await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
        "X-Title": "Smart Word Learning",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error("Помилка LLM (timeout): модель не відповіла за 30 с");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Тестовий провайдер (VITE_AI_PROVIDER=mock): детерміновані відповіді без мережі.
 * Використовується в автотестах і для демонстрації інтерфейсу без ключа.
 */
export const mockChat: ChatFn = async (messages) => {
  const prompt = messages.map((m) => m.content).join("\n");
  const word = prompt.match(/word "([^"]+)"/)?.[1] ?? "word";
  if (prompt.includes("TASK: validate")) {
    const sentence = prompt.match(/<sentence>([\s\S]*?)<\/sentence>/)?.[1]?.trim() ?? "";
    const ok = /^[A-ZА-ЯІЇЄҐ]/.test(sentence) && /[.!?]$/.test(sentence) && !/\b\w+s is\b/i.test(sentence);
    return JSON.stringify(
      ok
        ? { correct: true, message: "Чудово! Слово вжито правильно і доречно.", corrected: sentence }
        : {
            correct: false,
            message: "Слово вжито доречно, але є граматична помилка: підмет у множині потребує дієслова «are».",
            corrected: sentence.replace(/\b(\w+s) is\b/i, "$1 are"),
          },
    );
  }
  return JSON.stringify({
    sentences: [
      `Cloud APIs have become ${word} in modern mobile development.`,
      `Smartphones are so ${word} that most users never think about them.`,
      `In game design, the ${word} health bar is something players barely notice.`,
    ],
    explanation: `"${word}" means present, appearing, or found everywhere.`,
    translation: "повсюдний, всюдисущий",
  });
};
