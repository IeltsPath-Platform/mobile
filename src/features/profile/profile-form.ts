/** Bands a learner can pick for their self-reported level, in half steps. */
export const BAND_CHOICES = [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9] as const;

/** Band as typed or stored ("6.5", "6,5", "") to a number, or null when empty or unreadable. */
export function parseBand(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

/** Time zones most learners are in; any other zone still shows, under its IANA name. */
export const TIMEZONE_CHOICES = [
  { id: 'Asia/Ho_Chi_Minh', label: 'Việt Nam' },
  { id: 'Asia/Bangkok', label: 'Thái Lan' },
  { id: 'Asia/Singapore', label: 'Singapore' },
  { id: 'Asia/Tokyo', label: 'Nhật Bản' },
  { id: 'Asia/Seoul', label: 'Hàn Quốc' },
  { id: 'Australia/Sydney', label: 'Úc (Sydney)' },
  { id: 'Europe/London', label: 'Anh' },
  { id: 'Europe/Paris', label: 'Pháp, Đức' },
  { id: 'America/New_York', label: 'Mỹ (miền Đông)' },
  { id: 'America/Los_Angeles', label: 'Mỹ (miền Tây)' },
] as const;

export function timezoneLabel(id: string) {
  return TIMEZONE_CHOICES.find((zone) => zone.id === id)?.label ?? id;
}

/** The phone's own time zone, when the runtime can tell. */
export function deviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
