// Ported from frontend/src/features/study-time/{practiceSessionApi,usePracticeSession}.ts.
import { useEffect, useState } from 'react';

import { apiRequest } from '@/src/lib/api-client';
import { createRequestId } from '@/src/lib/request-id';

export type PracticeSessionKind = 'WRITING' | 'SPEAKING' | 'VOCABULARY';
export interface PracticeSession { id: string; kind: PracticeSessionKind; expiresAt: string }

export function openPracticeSession(requestId: string, kind: PracticeSessionKind, signal?: AbortSignal) {
  return apiRequest<PracticeSession>('/api/learning/practice-sessions', { method: 'POST', auth: true, body: { requestId, kind }, signal });
}

/** Opens a practice session for free Writing/Speaking work; its id is what study time is recorded against. */
export function usePracticeSession(kind: PracticeSessionKind, enabled = true): string | null {
  const [requestId] = useState(createRequestId);
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    openPracticeSession(requestId, kind, controller.signal)
      .then((session) => { if (!controller.signal.aborted) setId(session.id); })
      .catch(() => { if (!controller.signal.aborted) setId(null); });
    return () => controller.abort();
  }, [enabled, kind, requestId]);
  return id;
}
