import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/src/lib/api-client';
import { createRequestId } from '@/src/lib/request-id';
import { studyKeys, vocabularyStudyApi } from './study-api';
import { advanceStudyAttempt, canCompleteStudy, isUncertainStudyWrite } from './study-state';
import type { StartMode, StepResult, StudyAnswer, StudyAttempt, StudySummary } from './study-types';

type PendingAnswer = { attemptId: string; stepId: string; answer: StudyAnswer; requestId: string };
type Recovery = 'sync' | 'restart' | 'replay' | 'resume' | null;

export function useStudyAttempt(unitId: string, initialMode: StartMode) {
  const client = useQueryClient();
  const [attempt, setAttempt] = useState<StudyAttempt | null>(null);
  const [feedback, setFeedback] = useState<StepResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState<PendingAnswer | null>(null);
  const [recovery, setRecovery] = useState<Recovery>(null);
  const [mode, setMode] = useState<StartMode>(initialMode);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const startOperation = useRef<{ mode: StartMode; requestId: string } | null>(null);
  const completeOperation = useRef<string | null>(null);
  const pending = useRef<PendingAnswer | null>(null);

  const run = async (operation: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(null); setRecovery(null);
    try { await operation(); }
    catch (cause) {
      const failure = cause instanceof Error ? cause : new Error('Chưa kết nối được máy chủ. Hãy thử lại.');
      if (mounted.current) setError(failure);
      if (cause instanceof ApiError) {
        if (cause.code === 'ATTEMPT_EXPIRED' || cause.code === 'ATTEMPT_NOT_FOUND') setRecovery('restart');
        if (['STEP_OUT_OF_ORDER', 'STEP_NOT_FOUND', 'ATTEMPT_ALREADY_COMPLETED', 'ATTEMPT_NOT_COMPLETABLE'].includes(cause.code ?? '')) setRecovery('sync');
        if (cause.code === 'VOCAB_UNIT_COMPLETED') setRecovery('replay');
        if (cause.code === 'VOCAB_UNIT_NOT_COMPLETED') setRecovery('resume');
        if (cause.code === 'VOCAB_UNIT_LOCKED' || cause.code === 'VOCAB_UNIT_UNAVAILABLE' || cause.code === 'VOCAB_UNIT_NOT_FOUND') {
          void client.invalidateQueries({ queryKey: studyKeys.progress });
          void client.invalidateQueries({ queryKey: studyKeys.unitLists });
        }
        if (cause.code === 'VOCAB_NO_HEARTS') void client.invalidateQueries({ queryKey: studyKeys.summary });
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const start = (nextMode: StartMode = mode, fresh = false) => run(async () => {
    if (fresh || !startOperation.current) startOperation.current = { mode: nextMode, requestId: createRequestId() };
    const operation = startOperation.current;
    try {
      const next = await vocabularyStudyApi.start(unitId, operation.mode, operation.requestId);
      if (!mounted.current) return;
      setAttempt(next); setMode(operation.mode); setFeedback(null);
      pending.current = null; setPendingAnswer(null); completeOperation.current = null;
      startOperation.current = null;
      void client.invalidateQueries({ queryKey: studyKeys.progress });
    } catch (cause) {
      if (!isUncertainStudyWrite(cause as ApiError)) startOperation.current = null;
      throw cause;
    }
  });

  useEffect(() => {
    mounted.current = true;
    void start(initialMode);
    return () => { mounted.current = false; };
    // The sheet is keyed by unit ID and mounts once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  const answer = (value: StudyAnswer) => run(async () => {
    if (!attempt?.currentStepId || feedback) return;
    // An uncertain answer must be retried unchanged before edits are allowed.
    const submission = pending.current ?? {
      attemptId: attempt.attemptId, stepId: attempt.currentStepId,
      answer: value, requestId: createRequestId(),
    };
    pending.current = submission; setPendingAnswer(submission);
    try {
      const result = await vocabularyStudyApi.answer(submission.attemptId, submission.stepId, submission.answer, submission.requestId);
      if (!mounted.current) return;
      pending.current = null; setPendingAnswer(null);
      if (result.hearts) client.setQueryData<StudySummary>(studyKeys.summary, (current) => current ? { ...current, hearts: result.hearts! } : current);
      if (result.outcome === 'ACKNOWLEDGED') setAttempt((current) => current ? advanceStudyAttempt(current, result) : current);
      else setFeedback(result);
    } catch (cause) {
      if (!isUncertainStudyWrite(cause as ApiError)) { pending.current = null; setPendingAnswer(null); }
      throw cause;
    }
  });

  const continueAfterFeedback = () => {
    if (feedback) setAttempt((current) => current ? advanceStudyAttempt(current, feedback) : current);
    setFeedback(null); setError(null);
  };
  const sync = () => run(async () => {
    if (!attempt) return;
    const next = await vocabularyStudyApi.attempt(attempt.attemptId);
    if (!mounted.current) return;
    setAttempt(next); setFeedback(null); pending.current = null; setPendingAnswer(null);
    completeOperation.current = null;
  });
  const complete = () => run(async () => {
    if (!attempt || !canCompleteStudy(attempt)) return;
    completeOperation.current ??= createRequestId();
    try {
      const completion = await vocabularyStudyApi.complete(attempt.attemptId, completeOperation.current);
      if (!mounted.current) return;
      completeOperation.current = null;
      setAttempt({ ...attempt, status: 'COMPLETED', completion });
      // The server-provided summary is authoritative; refetch only when absent.
      if (completion.reward?.summary) client.setQueryData(studyKeys.summary, completion.reward.summary);
      else void client.invalidateQueries({ queryKey: studyKeys.summary });
      void client.invalidateQueries({ queryKey: studyKeys.progress });
      void client.invalidateQueries({ queryKey: ['flashcards'] });
    } catch (cause) {
      if (!isUncertainStudyWrite(cause as ApiError)) completeOperation.current = null;
      throw cause;
    }
  });
  const recover = () => {
    if (recovery === 'sync') return sync();
    return start(recovery === 'replay' ? 'REPLAY' : recovery === 'resume' || recovery === 'restart' ? 'RESUME_OR_START' : mode, Boolean(recovery));
  };
  return { attempt, feedback, error, busy, pendingAnswer, recovery, start, answer, continueAfterFeedback, complete, sync, recover,
    canComplete: canCompleteStudy(attempt), noHearts: error instanceof ApiError && error.code === 'VOCAB_NO_HEARTS' };
}
