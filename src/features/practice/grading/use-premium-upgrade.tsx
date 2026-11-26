import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState, type ReactNode } from 'react';

import { accessApi } from '../api/access';
import { isActivePremium } from '../model/premium';
import { ActivateKeySheet, PremiumPlansSheet } from './grading-sheets';
import type { ActivationProduct } from './products';

/** Whether the learner has Premium; undefined while unknown, so a screen then lets the server decide. */
export function usePremiumStatus(): boolean | undefined {
  const subscription = useQuery({ queryKey: ['access', 'subscription'], queryFn: ({ signal }) => accessApi.subscription(signal), staleTime: 60_000, retry: 1 });
  return subscription.data === undefined ? undefined : isActivePremium(subscription.data);
}

/** The way to Premium from a locked test: the plans, then the activation key. */
export function usePremiumUpgrade(onActivated?: () => void): { open: () => void; sheets: ReactNode } {
  const client = useQueryClient();
  const [plansOpen, setPlansOpen] = useState(false);
  const [product, setProduct] = useState<ActivationProduct | null>(null);
  const sheets = (
    <>
      <PremiumPlansSheet visible={plansOpen} onClose={() => setPlansOpen(false)} onChoose={(chosen) => { setPlansOpen(false); setProduct(chosen); }} />
      <ActivateKeySheet
        visible={product !== null}
        product={product}
        onActivated={() => { void client.invalidateQueries({ queryKey: ['access'] }); onActivated?.(); }}
        onClose={() => setProduct(null)}
      />
    </>
  );
  const open = useCallback(() => setPlansOpen(true), []);
  return { open, sheets };
}
