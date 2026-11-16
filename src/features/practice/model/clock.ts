/** "mm:ss", or "h:mm:ss" past an hour. */
export function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** "45 phút", "1 giờ 20 phút", or the flexible-time label when there is no limit. */
export function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return 'Thời gian linh hoạt';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} phút`;
  return `${Math.floor(minutes / 60)} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ''}`;
}
