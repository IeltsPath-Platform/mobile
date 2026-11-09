/**
 * Per-question record of the match being played, kept only in memory so the result screen can show which
 * answers were right or wrong. Scores and rewards always come from the server; this is display-only.
 */
export type ReviewItem = {
  id: string;
  meaning: string;
  correct: boolean;
  /** The word the learner needed; null when the server did not reveal it. */
  answer: string | null;
  /** What the learner picked or typed last, when it differs from the answer. */
  yours: string | null;
};

const MAX_MATCHES = 5;
const logs = new Map<string, ReviewItem[]>();

export function recordReview(matchId: string, item: ReviewItem) {
  const list = logs.get(matchId) ?? [];
  const index = list.findIndex((existing) => existing.id === item.id);
  if (index >= 0) list[index] = item;
  else list.push(item);
  logs.delete(matchId);
  logs.set(matchId, list);
  while (logs.size > MAX_MATCHES) {
    const oldest = logs.keys().next().value;
    if (oldest === undefined) break;
    logs.delete(oldest);
  }
}

export function getReview(matchId: string): ReviewItem[] {
  return logs.get(matchId) ?? [];
}
