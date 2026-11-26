import { ApiError } from '@/src/lib/api-client'

/** True when the server refused because this test needs Premium. An unreachable entitlement check is not this. */
export function isPremiumRequired(cause: unknown): boolean {
  return cause instanceof ApiError && cause.status === 403 && cause.code === 'PREMIUM_REQUIRED'
}
