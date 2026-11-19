import { afterEach, describe, expect, it, vi } from "vitest";
import { createChat, isConfigured, type LlmConfig } from "./client";

const cfg: LlmConfig = { provider: "openrouter", baseUrl: "https://example.test/v1", apiKey: "sk-test", model: "test-model" };
afterEach(() => vi.unstubAllGlobals());

describe("OpenAI-сумісний клієнт (FR-28)", () => {
  it("надсилає запит на {baseUrl}/chat/completions з моделлю з конфігурації", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: " ok " } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const out = await createChat(cfg)([{ role: "user", content: "hi" }]);
    expect(out).toBe("ok");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://example.test/v1/chat/completions");
    expect(JSON.parse(String(init.body)).model).toBe("test-model");
  });

  it("помилка HTTP перетворюється на зрозуміле повідомлення", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("rate limited", { status: 429 })));
    await expect(createChat(cfg)([{ role: "user", content: "hi" }])).rejects.toThrow(/429/);
  });

  it("без ключа запит не виконується", async () => {
    expect(isConfigured({ ...cfg, apiKey: "" })).toBe(false);
    expect(isConfigured({ ...cfg, provider: "mock", apiKey: "" })).toBe(true);
    await expect(createChat({ ...cfg, apiKey: "" })([])).rejects.toThrow(/ключ/);
  });

  it("для Gemini вмикає режим JSON і обмежує міркування", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await createChat({ ...cfg, provider: "gemini" })([{ role: "user", content: "hi" }], { json: true });
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.reasoning_effort).toBe("low");
    expect(body.max_tokens).toBeGreaterThanOrEqual(2048);
  });

  it("якщо модель не підтримує додаткові параметри (400) – повторює базовий запит", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("unknown field reasoning_effort", { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const out = await createChat({ ...cfg, provider: "gemini" })([{ role: "user", content: "hi" }], { json: true });
    expect(out).toBe("ok");
    const body = JSON.parse(String((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(body.reasoning_effort).toBeUndefined();
    expect(body.response_format).toBeUndefined();
  });

  it("порожня обрізана відповідь дає зрозумілу помилку", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "" }, finish_reason: "length" }] }), { status: 200 })));
    await expect(createChat(cfg)([{ role: "user", content: "hi" }])).rejects.toThrow(/обрізана/);
  });
});
