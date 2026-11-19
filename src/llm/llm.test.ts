import { describe, expect, it, vi } from "vitest";
import { extractJSON } from "./json";
import { containsWord, generateWordContent, validateSentence } from "./service";
import { mockChat, type ChatFn } from "./client";

const profile = { nativeLanguage: "uk", targetLanguage: "en", topics: ["ІТ"] };

describe("extractJSON", () => {
  it("чистий JSON", () => expect(extractJSON('{"a":1}')).toEqual({ a: 1 }));
  it("JSON у markdown-огорожі", () => expect(extractJSON('Ось:\n```json\n{"a":2}\n```')).toEqual({ a: 2 }));
  it("JSON серед тексту, з дужками в рядках", () => expect(extractJSON('text {"m":"a } b"} end')).toEqual({ m: "a } b" }));
  it("кома в кінці", () => expect(extractJSON('{"a":[1,2,],}')).toEqual({ a: [1, 2] }));
  it("некоректна відповідь → помилка", () => expect(() => extractJSON("no json here")).toThrow());
});

describe("containsWord (FR-30)", () => {
  it("знаходить словоформу", () => expect(containsWord("APIs are everywhere, truly ubiquitously.", "ubiquitous")).toBe(true));
  it("слова немає", () => expect(containsWord("It is everywhere.", "ubiquitous")).toBe(false));
  it("фраза з кількох слів", () => expect(containsWord("Let's break the ice now.", "break the ice")).toBe(true));
});

describe("LLM-сервіс із тестовим провайдером", () => {
  it("генерує контент: 3 речення, пояснення, переклад", async () => {
    const c = await generateWordContent("ubiquitous", profile, 0, mockChat);
    expect(c.sentences).toHaveLength(3);
    expect(c.translation).not.toBe("");
  });

  it("перевірка без слова не звертається до моделі", async () => {
    const chat = vi.fn(mockChat);
    const v = await validateSentence("It is everywhere.", "ubiquitous", profile, chat);
    expect(v.correct).toBe(false);
    expect(chat).not.toHaveBeenCalled();
  });

  it("правильне та неправильне речення", async () => {
    expect((await validateSentence("Smartphones are ubiquitous today.", "ubiquitous", profile, mockChat)).correct).toBe(true);
    const bad = await validateSentence("Smartphones is ubiquitous in our university.", "ubiquitous", profile, mockChat);
    expect(bad.correct).toBe(false);
    expect(bad.corrected).toContain("are");
  });

  it("невалідна відповідь → одна повторна спроба (FR-29)", async () => {
    let calls = 0;
    const flaky: ChatFn = async (m, o) => (++calls === 1 ? "sorry, I cannot" : mockChat(m, o));
    const v = await validateSentence("Smartphones are ubiquitous today.", "ubiquitous", profile, flaky);
    expect(v.correct).toBe(true);
    expect(calls).toBe(2);
  });

  it("дві невалідні відповіді → зрозуміла помилка", async () => {
    const broken: ChatFn = async () => '{"foo": 1}';
    await expect(validateSentence("Smartphones are ubiquitous.", "ubiquitous", profile, broken)).rejects.toThrow(/некоректну/);
  });

  it("помилка мережі не повторюється", async () => {
    const chat = vi.fn<ChatFn>(async () => {
      throw new Error("Помилка LLM (503): unavailable");
    });
    await expect(generateWordContent("word", profile, 0, chat)).rejects.toThrow(/503/);
    expect(chat).toHaveBeenCalledTimes(1);
  });
});
