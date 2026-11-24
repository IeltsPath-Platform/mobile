import { beforeEach, describe, expect, it } from 'vitest';

import { clockSeconds } from '@/src/features/practice/model/sections';
import { observeServerDate, offsetFromDateHeader, resetServerClock, serverNow, serverOffsetMs } from '@/src/lib/server-clock';

const iso = (ms: number) => new Date(ms).toUTCString();
const T = Date.UTC(2026, 10, 24, 15, 0, 0);

beforeEach(() => resetServerClock());

describe('offsetFromDateHeader', () => {
  it('is the difference between the server clock and the phone, measured at the middle of the round trip', () => {
    // Server says 15:00:00 (fraction cut: really about 15:00:00.5); the phone thought it was 14:50:00 for the whole call.
    const phone = T - 10 * 60_000;
    expect(offsetFromDateHeader(iso(T), phone, phone + 200)).toBe(10 * 60_000 + 500 - 100);
  });
  it.each([null, undefined, '', 'not a date'])('ignores an unreadable header: %j', (header) => expect(offsetFromDateHeader(header, T, T + 50)).toBeNull());
  it('ignores a call too slow to say when the server answered, and a negative round trip', () => {
    expect(offsetFromDateHeader(iso(T), T, T + 10_000)).toBeNull();
    expect(offsetFromDateHeader(iso(T), T + 50, T)).toBeNull();
  });
});

describe('serverNow', () => {
  it('equals the phone clock until a response has been seen', () => expect(serverNow(T)).toBe(T));
  it('moves the phone clock onto the server clock', () => {
    observeServerDate(iso(T), T - 5 * 60_000, T - 5 * 60_000 + 100); // phone is 5 minutes slow
    expect(Math.abs(serverNow(T - 5 * 60_000 + 100) - (T + 450))).toBeLessThan(1000);
  });
  it('does not move for differences that are only the rounding of the header', () => {
    observeServerDate(iso(T), T, T + 100);
    const first = serverOffsetMs();
    observeServerDate(iso(T + 5_000), T + 5_400, T + 5_500); // same offset, 0.4–1 s of rounding noise
    expect(serverOffsetMs()).toBe(first);
  });
  it('follows a real change of the phone clock', () => {
    observeServerDate(iso(T), T, T + 100);
    observeServerDate(iso(T + 60_000), T + 60_000 - 120_000, T + 60_000 - 120_000 + 100); // phone clock now 2 minutes slow
    expect(serverOffsetMs()).toBeGreaterThan(100_000);
  });
});

describe('clockSeconds on the server clock', () => {
  const attempt = { expiresAt: new Date(T + 20 * 60_000).toISOString(), startedAt: new Date(T).toISOString() } as never;
  it('counts a timed exam down from the server deadline even when the phone clock is wrong', () => {
    // The phone is 5 minutes fast, so by its own clock the exam has 15 minutes left; by the server's clock it has 20.
    const phoneNow = T + 5 * 60_000;
    observeServerDate(iso(T), phoneNow, phoneNow + 100);
    expect(clockSeconds(attempt, true, serverNow(phoneNow + 100))).toBeGreaterThan(19 * 60 + 58);
    expect(clockSeconds(attempt, true, phoneNow + 100)).toBe(15 * 60);
  });
  it('still takes an explicit time', () => expect(clockSeconds(attempt, true, T + 20 * 60_000)).toBe(0));
});
