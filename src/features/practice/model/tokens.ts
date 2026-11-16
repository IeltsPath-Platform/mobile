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

/** The words of `text` from word `start` to word `end`, inclusive. */
export function wordsBetween(text: string, start: number, end: number) {
  const words = text.split(/\s+/).filter(Boolean);
  return words.slice(Math.min(start, end), Math.max(start, end) + 1).join(' ');
}

/** A word without the punctuation around it, for dictionary lookup ("(dogs)," -> "dogs"). */
export function bareWord(word: string) {
  return word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}
