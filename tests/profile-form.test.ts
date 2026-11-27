import { describe, expect, it } from 'vitest';

import { BAND_CHOICES, parseBand, timezoneLabel } from '@/src/features/profile/profile-form';

describe('profile form', () => {
  it('reads a band whatever the decimal mark, and empty as no band', () => {
    expect(parseBand('6.5')).toBe(6.5);
    expect(parseBand('6,5')).toBe(6.5);
    expect(parseBand('7')).toBe(7);
    expect(parseBand('  ')).toBeNull();
    expect(parseBand('abc')).toBeNull();
  });

  it('offers half bands from 3 to 9', () => {
    expect(BAND_CHOICES[0]).toBe(3);
    expect(BAND_CHOICES[BAND_CHOICES.length - 1]).toBe(9);
    expect(BAND_CHOICES.every((band, i) => i === 0 || band - BAND_CHOICES[i - 1] === 0.5)).toBe(true);
  });

  it('names known time zones and falls back to the IANA id', () => {
    expect(timezoneLabel('Asia/Ho_Chi_Minh')).toBe('Việt Nam');
    expect(timezoneLabel('Africa/Cairo')).toBe('Africa/Cairo');
  });
});
