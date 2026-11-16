// Ported from frontend/src/features/home/accessApi.ts: the Points wallet, the Premium subscription and key activation.
import { z } from 'zod';

import { ApiError, apiRequest } from '@/src/lib/api-client';

const count = z.number().int().nonnegative().safe();
const timestamp = z.string();

const subscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  planId: z.string(),
  planCode: z.string(),
  planName: z.string(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']),
  startsAt: timestamp,
  endsAt: timestamp.nullable(),
  humanGradingCreditsTotal: count,
  humanGradingCreditsUsed: count,
  remainingCredits: count,
  createdAt: timestamp,
  updatedAt: timestamp,
});

const walletSchema = z.object({
  userId: z.string(),
  balance: count,
  totalCredited: count,
  totalDebited: count,
  updatedAt: timestamp,
});

const activationSchema = z.object({
  activationId: z.string(),
  keyId: z.string(),
  userId: z.string(),
  productType: z.enum(['POINTS', 'PREMIUM']),
  pointsGranted: count,
  premiumDaysGranted: count,
  humanGradingCreditsGranted: count,
  activatedAt: timestamp,
  newBalance: count.nullable(),
  subscriptionEndsAt: timestamp.nullable(),
});

export type Subscription = z.infer<typeof subscriptionSchema>;
export type PointWallet = z.infer<typeof walletSchema>;
export type ActivationResult = z.infer<typeof activationSchema>;

const KEY_ERROR_MESSAGES: Record<string, string> = {
  'Activation key has already been redeemed': 'Mã này đã được sử dụng.',
  'Activation key has expired': 'Mã kích hoạt đã hết hạn.',
  'Activation key has been revoked': 'Mã kích hoạt đã bị thu hồi.',
  'Mã kích hoạt không hợp lệ': 'Mã kích hoạt không hợp lệ. Vui lòng kiểm tra lại mã.',
};

export function normalizeActivationKey(rawKey: string): string {
  return rawKey.trim().toUpperCase();
}

/** Learner-facing text for a failed activation. */
export function activationErrorMessage(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 429) return 'Bạn thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.';
    if (cause.status >= 500) return 'Dịch vụ tạm thời gián đoạn. Vui lòng thử lại sau.';
    return KEY_ERROR_MESSAGES[cause.message] ?? (cause.message || 'Chưa thể kích hoạt mã. Vui lòng kiểm tra mã và thử lại.');
  }
  return cause instanceof Error ? cause.message : 'Chưa thể kích hoạt mã. Vui lòng kiểm tra mã và thử lại.';
}

export const accessApi = {
  /** Null when the learner has no subscription (the server answers 204). */
  async subscription(signal?: AbortSignal): Promise<Subscription | null> {
    const body = await apiRequest<unknown>('/api/access/me/subscription', { auth: true, signal });
    return body == null || body === '' ? null : subscriptionSchema.parse(body);
  },
  async wallet(signal?: AbortSignal): Promise<PointWallet> {
    return walletSchema.parse(await apiRequest<unknown>('/api/access/me/points', { auth: true, signal }));
  },
  async activateKey(rawKey: string, idempotencyKey: string): Promise<ActivationResult> {
    const normalizedKey = normalizeActivationKey(rawKey);
    if (!normalizedKey) throw new Error('Vui lòng nhập mã kích hoạt.');
    return activationSchema.parse(await apiRequest<unknown>('/api/access/me/keys/activate', {
      method: 'POST', auth: true, body: { rawKey: normalizedKey, idempotencyKey },
    }));
  },
};

export function isActivePremium(subscription: Subscription | null, now = Date.now()): boolean {
  return subscription?.planCode === 'PREMIUM' && subscription.status === 'ACTIVE'
    && (subscription.endsAt === null || Date.parse(subscription.endsAt) > now);
}
