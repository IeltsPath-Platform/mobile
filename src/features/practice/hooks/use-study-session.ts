// Ported from frontend/src/features/study-time/StudyActivityTracker.tsx for React Native (AppState instead of tab visibility).
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/src/features/auth/auth-provider';
import { ApiError, apiRequest } from '@/src/lib/api-client';
import { createRequestId } from '@/src/lib/request-id';

type SourceType = 'LESSON' | 'PRACTICE' | 'REVIEW' | 'ASSESSMENT' | 'WRITING' | 'SPEAKING' | 'VOCABULARY';
interface Session { sessionId: string; epoch: number; serverStartedAt: string; serverNow: string; nextSequence: number }
interface ActiveInterval { startOffsetMs: number; endOffsetMs: number }
interface Payload { epoch: number; sequence: number; intervals: ActiveInterval[] }

const DEFAULT_IDLE_MS = 120_000;
/** Reading and writing screens go quiet for longer while the learner thinks. */
const LONG_FORM_IDLE_MS = 300_000;
const HEARTBEAT_MS = 30_000;

/** Monotonic offsets; time in the background and after the idle boundary is never counted. */
export class ActiveIntervals {
  private intervals: ActiveInterval[] = [];
  private previous: number;
  private lastActivity: number;
  constructor(startOffset: number, private idleMs: number = DEFAULT_IDLE_MS) { this.previous = startOffset; this.lastActivity = startOffset; }
  activity(offset: number) { this.lastActivity = offset; }
  sample(offset: number, visible: boolean, mediaActive: boolean) {
    const start = this.previous;
    this.previous = offset;
    if (!visible || offset <= start || offset - start > 5000) return;
    const end = mediaActive ? offset : Math.min(offset, this.lastActivity + this.idleMs);
    if (end <= start) return;
    const last = this.intervals.at(-1);
    if (last?.endOffsetMs === start) last.endOffsetMs = end;
    else if (this.intervals.length < 16) this.intervals.push({ startOffsetMs: start, endOffsetMs: end });
  }
  take(): ActiveInterval[] { const intervals = this.intervals; this.intervals = []; return intervals; }
}

/**
 * Records active study time of one test screen through `/api/users/me/study-sessions`. Telemetry never blocks the test:
 * failures are swallowed. Call `markActivity` on touches and set `mediaActive` while audio plays or a recording runs.
 */
export function useStudySession(sourceType: SourceType, sourceId: string, enabled = true) {
  const { authEnabled, status } = useAuth();
  const active = enabled && authEnabled && status === 'authenticated' && Boolean(sourceId);
  const activityRef = useRef<(() => void) | null>(null);
  const mediaRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let session: Session | null = null;
    let collector: ActiveIntervals | null = null;
    let anchor = 0;
    let baseOffset = 0;
    let sequence = 1;
    let pending: Payload | null = null;
    let lifecycle: Promise<void> = Promise.resolve();
    let foreground = AppState.currentState === 'active';
    const offset = () => Math.max(0, Math.floor(baseOffset + Date.now() - anchor));
    const sample = () => collector?.sample(offset(), foreground, mediaRef.current);
    activityRef.current = () => collector?.activity(offset());

    const post = (path: string, body: unknown) => apiRequest(path, { method: 'POST', auth: true, body, timeoutMs: 10_000 });

    async function start() {
      if (disposed || session || !foreground) return;
      try {
        const created = await apiRequest<Session>('/api/users/me/study-sessions', {
          method: 'POST', auth: true, timeoutMs: 10_000,
          body: { clientSessionId: createRequestId(), sourceType, sourceId, takeover: true },
        });
        session = created;
        sequence = created.nextSequence;
        baseOffset = Math.max(0, Date.parse(created.serverNow) - Date.parse(created.serverStartedAt));
        anchor = Date.now();
        collector = new ActiveIntervals(Math.floor(baseOffset), sourceType === 'ASSESSMENT' || sourceType === 'WRITING' ? LONG_FORM_IDLE_MS : DEFAULT_IDLE_MS);
      } catch { /* Study time is best effort. */ }
    }

    async function flush() {
      if (!session) return;
      sample();
      const captured = session;
      pending ??= { epoch: captured.epoch, sequence, intervals: collector?.take() ?? [] };
      try {
        await post(`/api/users/me/study-sessions/${captured.sessionId}/heartbeats`, pending);
        sequence++;
        pending = null;
      } catch (reason) {
        const code = reason instanceof ApiError ? reason.code : undefined;
        if (code === 'LEASE_EXPIRED' || code === 'SESSION_CLOSED' || code === 'SESSION_NOT_FOUND') { session = null; collector = null; pending = null; }
      }
    }

    async function close() {
      const captured = session;
      if (!captured) return;
      sample();
      const remaining = collector?.take() ?? [];
      session = null;
      collector = null;
      try {
        if (pending) { await post(`/api/users/me/study-sessions/${captured.sessionId}/heartbeats`, pending); pending = null; sequence++; }
        await post(`/api/users/me/study-sessions/${captured.sessionId}/close`, { epoch: captured.epoch, sequence, intervals: remaining });
      } catch { /* The server lease caps any lost tail. */ }
    }

    lifecycle = lifecycle.then(start);
    const sampleTimer = setInterval(sample, 1000);
    const heartbeatTimer = setInterval(() => { if (foreground) lifecycle = lifecycle.then(flush); }, HEARTBEAT_MS);
    const subscription = AppState.addEventListener('change', (next) => {
      const nowForeground = next === 'active';
      if (nowForeground === foreground) return;
      sample();
      foreground = nowForeground;
      lifecycle = lifecycle.then(nowForeground ? start : close);
    });
    return () => {
      disposed = true;
      clearInterval(sampleTimer);
      clearInterval(heartbeatTimer);
      subscription.remove();
      activityRef.current = null;
      lifecycle = lifecycle.then(close);
    };
  }, [active, sourceType, sourceId]);

  const markActivity = useCallback(() => activityRef.current?.(), []);
  const setMediaActive = useCallback((value: boolean) => { mediaRef.current = value; }, []);
  return { markActivity, setMediaActive };
}
