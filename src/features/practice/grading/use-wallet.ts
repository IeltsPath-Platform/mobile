import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { accessApi, type ActivationResult, type Subscription } from '../api/access';

/** `subscription` is null for a learner without any, undefined when it could not be read; `balance` null when unread. */
export type GradingAccess = { balance: number | null; subscription: Subscription | null | undefined };

/** The Points balance (which pays for an AI grade) and the Premium subscription (teacher credits), read on demand. */
export function useWallet() {
  const client = useQueryClient();
  const [access, setAccess] = useState<GradingAccess>({ balance: null, subscription: undefined });

  const checkAccess = useCallback(async (): Promise<GradingAccess> => {
    const [wallet, subscription] = await Promise.allSettled([accessApi.wallet(), accessApi.subscription()]);
    const next: GradingAccess = {
      balance: wallet.status === 'fulfilled' ? wallet.value.balance : null,
      subscription: subscription.status === 'fulfilled' ? subscription.value : undefined,
    };
    setAccess(next);
    return next;
  }, []);

  const onActivated = useCallback((result: ActivationResult) => {
    setAccess((current) => ({ ...current, balance: result.newBalance ?? current.balance }));
    void client.invalidateQueries({ queryKey: ['access'] });
    void checkAccess();
  }, [client, checkAccess]);

  return { access, checkAccess, onActivated };
}
