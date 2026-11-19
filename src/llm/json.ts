/** Витягує JSON-об'єкт з відповіді мовної моделі (з markdown-огорожею, зайвим текстом тощо). */
export function extractJSON(text: string): unknown {
  const attempts: string[] = [text];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) attempts.push(fence[1].trim());
  attempts.push(...topLevelObjects(text).sort((a, b) => b.length - a.length));

  for (const candidate of attempts) {
    for (const variant of [candidate, candidate.replace(/,\s*([}\]])/g, "$1")]) {
      try {
        return JSON.parse(variant);
      } catch {
        /* пробуємо наступний варіант */
      }
    }
  }
  throw new Error(`Не вдалося розібрати JSON у відповіді моделі: ${text.slice(0, 120)}…`);
}

/** Знаходить усі об'єкти верхнього рівня {...}, ігноруючи дужки всередині рядків. */
function topLevelObjects(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      i++;
      while (i < text.length && text[i] !== '"') i += text[i] === "\\" ? 2 : 1;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}" && depth > 0) {
      depth--;
      if (depth === 0) out.push(text.slice(start, i + 1));
    }
  }
  return out;
}
