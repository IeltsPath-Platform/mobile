import { describe, expect, it } from 'vitest';

import { resolveMatchTap } from '../src/features/vocab/match-selection';

describe('resolveMatchTap', () => {
  it('selects the first tap', () => {
    expect(resolveMatchTap(null, { id: 'a', side: 'word' })).toEqual({
      type: 'select',
      selection: { id: 'a', side: 'word' },
    });
  });

  it('does not match the same item tapped twice in one column', () => {
    expect(
      resolveMatchTap({ id: 'a', side: 'word' }, { id: 'a', side: 'word' }),
    ).toEqual({ type: 'select', selection: { id: 'a', side: 'word' } });
  });

  it('switches selection when another item in the same column is tapped', () => {
    expect(
      resolveMatchTap({ id: 'a', side: 'word' }, { id: 'b', side: 'word' }),
    ).toEqual({ type: 'select', selection: { id: 'b', side: 'word' } });
  });

  it('matches equal ids across columns in either order', () => {
    expect(
      resolveMatchTap({ id: 'a', side: 'word' }, { id: 'a', side: 'meaning' }),
    ).toEqual({ type: 'match' });
    expect(
      resolveMatchTap({ id: 'a', side: 'meaning' }, { id: 'a', side: 'word' }),
    ).toEqual({ type: 'match' });
  });

  it('reports a mismatch for different ids across columns', () => {
    expect(
      resolveMatchTap({ id: 'a', side: 'word' }, { id: 'b', side: 'meaning' }),
    ).toEqual({ type: 'mismatch' });
  });
});
