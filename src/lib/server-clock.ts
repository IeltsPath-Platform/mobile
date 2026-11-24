/**
 * Server time, learned from the `Date` header of every API response. Exam deadlines are server timestamps, so comparing
 * them with a phone whose clock is minutes off would submit the test early or let it run past its limit.
 *
 * Where the header cannot be read (a browser blocks it across origins) the offset stays 0 and the device clock is used.
 */
let offsetMs = 0;

/** A response that took longer than this says too little about the moment the server answered. */
const MAX_ROUND_TRIP_MS = 3_000;
/** HTTP dates are whole seconds; differences smaller than this are rounding, not a real clock change. */
const ROUNDING_MS = 1_000;

/** Server time minus device time for one response, or null when the header is missing, unreadable or the call too slow. */
export function offsetFromDateHeader(header: string | null | undefined, sentAt: number, receivedAt: number): number | null {
  if (!header) return null;
  const server = Date.parse(header);
  const roundTrip = receivedAt - sentAt;
  if (!Number.isFinite(server) || roundTrip < 0 || roundTrip > MAX_ROUND_TRIP_MS) return null;
  // The server cut the fraction of the second, so on average it was half a second later; it answered mid round trip.
  return server + 500 - (sentAt + roundTrip / 2);
}

export function observeServerDate(header: string | null | undefined, sentAt: number, receivedAt: number) {
  const next = offsetFromDateHeader(header, sentAt, receivedAt);
  if (next === null) return;
  // Keep the first estimate while new ones differ only by the rounding, so a clock on screen does not jump by a second.
  if (!hasSample || Math.abs(next - offsetMs) > ROUNDING_MS) offsetMs = next;
  hasSample = true;
}

let hasSample = false;

/** Milliseconds since the epoch on the server's clock. */
export function serverNow(deviceNow: number = Date.now()): number {
  return deviceNow + offsetMs;
}

export function serverOffsetMs(): number {
  return offsetMs;
}

export function resetServerClock() {
  offsetMs = 0;
  hasSample = false;
}
