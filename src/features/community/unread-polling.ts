/**
 * How often the unread-notification count is asked for while the app is in front. A push notification refreshes it at
 * once (see the root layout), so this is only the safety net for pushes that never arrive. One request per learner per
 * minute: 3,000 learners with the app open cost about 50 requests a second instead of 100.
 */
export const UNREAD_POLL_MS = 60_000;

/** A Reading, Listening, Writing or Speaking test in progress: no badge is shown there, so the count is not asked for. */
const TEST_SCREEN = /^\/practice\/(reading|listening|writing|speaking)\//;

export function isTestScreen(pathname: string): boolean {
  return TEST_SCREEN.test(pathname);
}

/** The count is only worth asking for while signed in, with the app in front and outside a test. */
export function shouldPollUnread(input: { authenticated: boolean; appActive: boolean; pathname: string }): boolean {
  return input.authenticated && input.appActive && !isTestScreen(input.pathname);
}
