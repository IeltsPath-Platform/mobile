import { describe, expect, it } from 'vitest';
import {
  applyWordHint,
  hintUnavailableReason,
} from '../src/features/games/wordly-hint';
import type { CurrentWord, Hint } from '../src/features/games/types';

const hint: Hint = {
  playerWordId: 'word-1',
  sourceGuess: 'CAT',
  sourceLetters: ['ABSENT', 'CORRECT', 'ABSENT'],
  revealedCell: { column: 0, letter: 'B', status: 'CORRECT' },
  hintUsed: true,
};
const word = (guesses: CurrentWord['guesses'] = []): CurrentWord => ({
  playerWordId: 'word-1',
  wordNumber: 1,
  wordLimit: 5,
  meaning: 'Con dơi',
  columns: 3,
  maxAttempts: 6,
  attemptsUsed: guesses.length,
  timeEnabled: false,
  deadlineAt: null,
  wordStatus: 'ACTIVE',
  player: {
    status: 'ACTIVE',
    livesRemaining: 4,
    totalScore: 0,
    currentStreak: 0,
    bestStreak: 0,
  },
  guesses,
  keyboard: {},
  hint: null,
});

describe('Wordly hint flow', () => {
  it('requires a server-accepted guess, not just text typed into the input', () => {
    expect(hintUnavailableReason(word())).not.toBeNull();
    expect(
      hintUnavailableReason(
        word([{ attemptNumber: 1, guess: 'CAT', letters: hint.sourceLetters }]),
      ),
    ).toBeNull();
  });
  it('blocks hints for finished words and inactive players', () => {
    expect(
      hintUnavailableReason({ ...word(), wordStatus: 'TIMED_OUT' }),
    ).not.toBeNull();
    expect(
      hintUnavailableReason({
        ...word(),
        player: { ...word().player, status: 'ELIMINATED' },
      }),
    ).not.toBeNull();
  });
  it('shows the actual server letter at its zero-based column', () => {
    expect(applyWordHint(word(), hint)?.hint?.revealedCell).toEqual({
      column: 0,
      letter: 'B',
      status: 'CORRECT',
    });
  });
  it('ignores late hint responses after advancing to another word', () => {
    const next = { ...word(), playerWordId: 'word-2' };
    expect(applyWordHint(next, hint)).toBe(next);
    expect(applyWordHint(undefined, hint)).toBeUndefined();
  });
});
