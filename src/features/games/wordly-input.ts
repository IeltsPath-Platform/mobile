/** Normalize native keyboard input and enforce the server-provided answer length. */
export function normalizeWordlyGuess(value: string, maxLetters: number) {
  const limit = Number.isFinite(maxLetters)
    ? Math.max(0, Math.trunc(maxLetters))
    : 0;

  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/gi, '')
    .toUpperCase()
    .slice(0, limit);
}
