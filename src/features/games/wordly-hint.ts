import type { CurrentWord, Hint } from './types';

export function hintUnavailableReason(word: CurrentWord): string | null {
  if (word.hint?.hintUsed) return null;
  if (word.wordStatus !== 'ACTIVE' || word.player.status !== 'ACTIVE')
    return 'Từ này đã kết thúc.';
  if (!word.guesses.length) return 'Thử đoán một lần để mở gợi ý.';
  return null;
}

/** A late response must never attach a previous word's hint to the next word. */
export function applyWordHint(
  word: CurrentWord | undefined,
  hint: Hint,
): CurrentWord | undefined {
  return word?.playerWordId === hint.playerWordId ? { ...word, hint } : word;
}
