import { describe, expect, it } from 'vitest';
import {
  isGameAvailable,
  mergeRanking,
  type GameRanking,
} from '../src/features/games/types';
import { normalizeWordlyGuess } from '../src/features/games/wordly-input';

describe('Wordly contract helpers', () => {
  it('normalizes native keyboard input and never exceeds the server word length', () => {
    expect(normalizeWordlyGuess('iPhone!!', 5)).toBe('IPHON');
    expect(normalizeWordlyGuess('café-123', 8)).toBe('CAFE');
    expect(normalizeWordlyGuess('institute', 4)).toBe('INST');
    expect(normalizeWordlyGuess('hello', 0)).toBe('');
    expect(normalizeWordlyGuess('hello', Number.NaN)).toBe('');
  });

  it('only enables Wordly when the backend catalog says AVAILABLE', () => {
    expect(
      isGameAvailable({
        gameType: 'WORDLY',
        status: 'AVAILABLE',
        name: '',
        description: '',
      }, 'WORDLY'),
    ).toBe(true);
    expect(
      isGameAvailable({
        gameType: 'WORDLY',
        status: 'COMING_SOON',
        name: '',
        description: '',
      }, 'WORDLY'),
    ).toBe(false);
    expect(
      isGameAvailable({
        gameType: 'OTHER',
        status: 'AVAILABLE',
        name: '',
        description: '',
      }, 'WORDLY'),
    ).toBe(false);
  });
  it('does not replace a newer ranking with a late socket frame', () => {
    const ranking = (serverTime: string) =>
      ({
        matchId: 'm',
        status: 'RUNNING',
        playerMode: 'SOLO',
        isFinal: false,
        serverTime,
        players: [],
      }) as GameRanking;
    const newer = ranking('2026-10-21T10:00:02.000Z');
    expect(mergeRanking(newer, ranking('2026-10-21T10:00:01.000Z'))).toBe(
      newer,
    );
    expect(mergeRanking(null, newer)).toBe(newer);
  });
});
