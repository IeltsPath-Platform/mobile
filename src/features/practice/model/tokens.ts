/** A run of text split into words and the spaces between them; only words are numbered (`index`). */
export type Token = { text: string; index: number | null };

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue;
    if (/^\s+$/.test(part)) tokens.push({ text: part, index: null });
    else tokens.push({ text: part, index: index++ });
  }
  return tokens;
}

/** A word without the punctuation around it, for dictionary lookup ("(dogs)," -> "dogs"). */
export function bareWord(word: string) {
  return word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'was', 'were', 'has', 'have', 'had', 'but', 'not', 'with', 'from', 'that', 'this', 'these', 'those',
  'its', 'his', 'her', 'their', 'our', 'your', 'who', 'whom', 'which', 'what', 'when', 'where', 'than', 'then', 'there', 'been',
  'being', 'will', 'would', 'can', 'could', 'may', 'might', 'shall', 'should', 'also', 'into', 'over', 'such', 'only', 'some',
  'any', 'all', 'one', 'out', 'off', 'per', 'via', 'too', 'very', 'just', 'more', 'most', 'much', 'many', 'each', 'both',
]);

/**
 * The words worth looking up in a selection. One word is always looked up. A phrase gives its distinct words in reading
 * order, without the little words that carry no meaning of their own, up to `max`.
 */
export function lookupWords(text: string, max = 8): string[] {
  const words = text.split(/\s+/).map(bareWord).filter(Boolean);
  if (words.length <= 1) return words;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const word of words) {
    const key = word.toLowerCase();
    if (key.length < 3 || STOP_WORDS.has(key) || /^\d+$/.test(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(word);
    if (result.length >= max) break;
  }
  return result;
}
