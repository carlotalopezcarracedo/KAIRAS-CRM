// Funciones puras de búsqueda para KAIRAS OS.
// La normalización hace que acentos, mayúsculas y errores leves no bloqueen
// una consulta. No depende de Prisma y se puede probar de forma aislada.

export type SearchableKnowledge = {
  title: string;
  summary?: string | null;
  area?: string | null;
  sector?: string | null;
  hypothesisRef?: string | null;
  funnelStage?: string | null;
  awarenessLevel?: string | null;
  temperature?: string | null;
  channel?: string | null;
  targetType?: string | null;
  targetId?: string | null;
};

const SEARCH_STOP_WORDS = new Set([
  "a",
  "al",
  "como",
  "con",
  "cual",
  "de",
  "del",
  "el",
  "en",
  "la",
  "las",
  "lo",
  "los",
  "para",
  "por",
  "que",
  "un",
  "una",
  "y",
]);

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

function tokenMatches(query: string, word: string): boolean {
  if (word === query) return true;
  if (query.length >= 3 && word.startsWith(query)) return true;
  if (word.length >= 4 && query.startsWith(word)) return true;
  if (query.length < 4 || Math.abs(query.length - word.length) > 2) return false;
  const tolerance = query.length >= 7 ? 2 : 1;
  return editDistance(query, word) <= tolerance;
}

export function scoreKnowledgeMatch(query: string, entry: SearchableKnowledge): number {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) return 0;

  const title = normalizeSearchText(entry.title);
  const secondary = normalizeSearchText(
    [
      entry.summary,
      entry.area,
      entry.sector,
      entry.hypothesisRef,
      entry.funnelStage,
      entry.awarenessLevel,
      entry.temperature,
      entry.channel,
      entry.targetType,
      entry.targetId,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const allWords = `${title} ${secondary}`.split(/\s+/).filter(Boolean);

  let score = 0;
  if (title === normalizedQuery) score += 160;
  else if (title.startsWith(normalizedQuery)) score += 120;
  else if (title.includes(normalizedQuery)) score += 90;
  else if (secondary.includes(normalizedQuery)) score += 60;

  const queryTokens = normalizedQuery
    .split(/\s+/)
    .filter((token) => token && !SEARCH_STOP_WORDS.has(token));
  if (queryTokens.length === 0) return 0;
  const titleWords = title.split(/\s+/).filter(Boolean);
  let matchedTokens = 0;
  for (const token of queryTokens) {
    const titleMatch = titleWords.some((word) => tokenMatches(token, word));
    const match = allWords.some((word) => tokenMatches(token, word));
    if (match) {
      matchedTokens += 1;
      score += titleMatch ? 24 : 12;
    }
  }

  const required = queryTokens.length === 1 ? 1 : Math.ceil(queryTokens.length / 2);
  return matchedTokens >= required ? score : 0;
}
