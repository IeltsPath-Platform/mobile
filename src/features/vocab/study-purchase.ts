import type { QueryClient } from '@tanstack/react-query';
import { studyKeys, vocabularyStudyApi } from './study-api';
import { isUncertainStudyWrite } from './study-state';
import { createRequestId } from '@/src/lib/request-id';
import type { StudySummary } from './study-types';

export type StudyPurchase = {
  kind: 'refill' | 'freeze'; cost: number; requestId: string; inFlight: boolean;
};

/** Account cache survives panel unmounts and is cleared by the auth provider on logout. */
export async function purchaseStudyBenefit(client: QueryClient, selection: Pick<StudyPurchase, 'kind' | 'cost'>) {
  const pending = client.getQueryData<StudyPurchase | null>(studyKeys.purchase);
  if (pending?.inFlight) return null;
  const operation: StudyPurchase = { ...(pending ?? { ...selection, requestId: createRequestId() }), inFlight: true };
  client.setQueryData(studyKeys.purchase, operation);
  const stillCurrent = () => client.getQueryData<StudyPurchase>(studyKeys.purchase)?.requestId === operation.requestId;
  try {
    const result = operation.kind === 'refill'
      ? await vocabularyStudyApi.refill(operation.requestId)
      : await vocabularyStudyApi.freeze(operation.requestId);
    if (!stillCurrent()) return null;
    client.setQueryData<StudySummary>(studyKeys.summary, (current) => current ? {
      ...current,
      ...('hearts' in result ? { hearts: result.hearts } : { streak: result.streak }),
    } : current);
    client.setQueryData(studyKeys.purchase, null);
    void client.invalidateQueries({ queryKey: studyKeys.summary });
    return { kind: operation.kind, balance: result.pointsBalanceAfter };
  } catch (cause) {
    if (stillCurrent()) {
      client.setQueryData(studyKeys.purchase, isUncertainStudyWrite(cause) ? { ...operation, inFlight: false } : null);
      void client.invalidateQueries({ queryKey: studyKeys.summary });
    }
    throw cause;
  }
}
