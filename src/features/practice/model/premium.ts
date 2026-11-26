import type { Subscription } from '../api/access'

/** Whether the learner has Premium right now. False for no subscription and for one that could not be read. */
export function isActivePremium(subscription: Subscription | null | undefined, now = Date.now()): boolean {
  if (!subscription || subscription.status !== 'ACTIVE') return false
  return subscription.endsAt === null || Date.parse(subscription.endsAt) > now
}
