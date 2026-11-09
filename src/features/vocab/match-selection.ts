export type MatchSide = 'word' | 'meaning';
export type MatchTap = { id: string; side: MatchSide };

export type MatchResolution =
  | { type: 'select'; selection: MatchTap }
  | { type: 'match' }
  | { type: 'mismatch' };

/** A pair counts only when the taps come from different columns and share an id. */
export function resolveMatchTap(
  selected: MatchTap | null,
  tap: MatchTap,
): MatchResolution {
  if (!selected || selected.side === tap.side)
    return { type: 'select', selection: tap };
  return selected.id === tap.id ? { type: 'match' } : { type: 'mismatch' };
}
