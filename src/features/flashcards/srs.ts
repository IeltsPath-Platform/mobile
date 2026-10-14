import type { SrsRating, SrsState, StudyCard } from './types';

const DAY_MS = 86_400_000;

/** Short SM-2: Again resets the card; Good grows the interval. */
export function applySrs(prev: SrsState | undefined, rating: SrsRating, now: number): SrsState {
  const ease = prev?.ease ?? 2.5;
  if (rating === 'again') {
    return {
      ease: Math.max(1.3, Math.round((ease - 0.2) * 100) / 100),
      intervalDays: 0,
      dueAt: now,
      reps: 0,
    };
  }
  const reps = (prev?.reps ?? 0) + 1;
  const intervalDays = reps === 1 ? 1 : Math.max(1, Math.round((prev?.intervalDays || 1) * ease));
  return {
    ease: Math.min(3, Math.round((ease + 0.1) * 100) / 100),
    intervalDays,
    dueAt: now + intervalDays * DAY_MS,
    reps,
  };
}

export function buildQueue(cards: StudyCard[], states: Record<string, SrsState>, now: number, limit = 20): StudyCard[] {
  const due = cards.filter((card) => {
    const state = states[card.id];
    return !state || state.dueAt <= now;
  });
  return due.slice(0, limit);
}
