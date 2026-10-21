import { describe, expect, it } from 'vitest';
import { dueAt, isWordlyAvailable, mergeRanking, type GameRanking } from '../src/features/games/types';

describe('Wordly contract helpers', () => {
  it('only enables Wordly when the backend catalog says AVAILABLE', () => {
    expect(isWordlyAvailable({ gameType: 'WORDLY', status: 'AVAILABLE', name: '', description: '' })).toBe(true);
    expect(isWordlyAvailable({ gameType: 'WORDLY', status: 'COMING_SOON', name: '', description: '' })).toBe(false);
    expect(isWordlyAvailable({ gameType: 'OTHER', status: 'AVAILABLE', name: '', description: '' })).toBe(false);
  });
  it('renders remaining server deadline without deciding game timeout locally', () => {
    expect(dueAt('2026-10-21T10:00:10.000Z', Date.parse('2026-10-21T10:00:00.000Z'))).toBe(10);
    expect(dueAt('2026-10-21T10:00:00.000Z', Date.parse('2026-10-21T10:00:10.000Z'))).toBe(0);
    expect(dueAt(null, Date.now())).toBeNull();
  });
  it('does not replace a newer ranking with a late socket frame', () => {
    const ranking = (serverTime: string) => ({ matchId: 'm', status: 'RUNNING', playerMode: 'SOLO', isFinal: false, serverTime, players: [] }) as GameRanking;
    const newer = ranking('2026-10-21T10:00:02.000Z');
    expect(mergeRanking(newer, ranking('2026-10-21T10:00:01.000Z'))).toBe(newer);
    expect(mergeRanking(null, newer)).toBe(newer);
  });
});
