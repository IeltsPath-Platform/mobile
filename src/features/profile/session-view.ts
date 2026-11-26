/** What to call the device behind a session, from the User-Agent the server stored at sign-in. */
export function describeDevice(userAgent: string | null | undefined): string {
  const agent = userAgent ?? '';
  if (!agent.trim()) return 'Thiết bị không xác định';
  // The app's own requests carry the HTTP client of the platform, not a browser name.
  if (/okhttp/i.test(agent)) return 'Ứng dụng trên Android';
  if (/CFNetwork/i.test(agent)) return 'Ứng dụng trên iPhone/iPad';
  const browser = /Edg\//.test(agent) ? 'Edge'
    : /OPR\//.test(agent) ? 'Opera'
      : /Firefox\//.test(agent) ? 'Firefox'
        : /Chrome\//.test(agent) ? 'Chrome'
          : /Safari\//.test(agent) ? 'Safari' : null;
  const system = /Android/.test(agent) ? 'Android'
    : /iPhone|iPad/.test(agent) ? 'iOS'
      : /Windows/.test(agent) ? 'Windows'
        : /Mac OS X/.test(agent) ? 'macOS'
          : /Linux/.test(agent) ? 'Linux' : null;
  if (browser) return system ? `Trình duyệt ${browser} trên ${system}` : `Trình duyệt ${browser}`;
  return system ? `Thiết bị ${system}` : 'Thiết bị khác';
}

/** The server sends its UTC time without a zone; reading it as local time would be off by the phone's offset. */
export function formatSessionTime(value: string | null | undefined): string {
  if (!value) return '—';
  const zoned = /(Z|[+-]\d\d:?\d\d)$/.test(value) ? value : `${value}Z`;
  const date = new Date(zoned);
  if (Number.isNaN(date.getTime())) return '—';
  const two = (part: number) => String(part).padStart(2, '0');
  return `${two(date.getHours())}:${two(date.getMinutes())} ${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()}`;
}
