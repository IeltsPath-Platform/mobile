import { describe, expect, it } from 'vitest';

import { isTestScreen, shouldPollUnread, UNREAD_POLL_MS } from '@/src/features/community/unread-polling';

describe('unread polling', () => {
  it('asks once a minute at most', () => expect(UNREAD_POLL_MS).toBeGreaterThanOrEqual(60_000));

  it.each([
    '/practice/reading/abc', '/practice/listening/abc', '/practice/writing/pkg/section', '/practice/speaking/pkg/section',
  ])('does not ask during a test: %s', (path) => expect(isTestScreen(path)).toBe(true));

  it.each([
    '/', '/community', '/notifications', '/flashcards', '/practice/catalog/reading', '/practice/result/abc', '/practice/history', '/practice/writing-result/abc',
  ])('asks everywhere else: %s', (path) => expect(isTestScreen(path)).toBe(false));

  it('asks only when signed in, in front and outside a test', () => {
    const base = { authenticated: true, appActive: true, pathname: '/' };
    expect(shouldPollUnread(base)).toBe(true);
    expect(shouldPollUnread({ ...base, authenticated: false })).toBe(false);
    expect(shouldPollUnread({ ...base, appActive: false })).toBe(false);
    expect(shouldPollUnread({ ...base, pathname: '/practice/reading/abc' })).toBe(false);
  });
});
