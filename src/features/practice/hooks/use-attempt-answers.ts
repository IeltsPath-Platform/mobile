// Ported from frontend/src/features/learning-path/lib/useAttemptAnswers.ts.
import { useCallback, useEffect, useRef, useState } from 'react';

import { saveAttemptAnswer } from '../api/attempts';
import { answerOf, type SavedResponse } from '../model/sections';

export type SaveState = 'saving' | 'saved' | 'error';

/**
 * Keeps the answers of one attempt and saves each item through the revisioned `PUT .../response`.
 * Saves of one item run in order, an unchanged value is not sent again, and a failed save is reported per item so
 * the screen can retry it before submitting. A resumed attempt starts from the saved responses and their revisions.
 */
export function useAttemptAnswers(attemptId: string, saved: SavedResponse[]) {
  const [initial] = useState(() => {
    const answers: Record<string, string> = {};
    const revisions: Record<string, number> = {};
    for (const response of saved) {
      revisions[response.attemptItemId] = response.revision;
      const answer = answerOf(response.payload);
      if (answer !== null) answers[response.attemptItemId] = answer;
    }
    return { answers, revisions };
  });
  const [answers, setAnswers] = useState<Record<string, string>>(initial.answers);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const savedValues = useRef<Record<string, string>>({ ...initial.answers });
  const revisions = useRef<Record<string, number>>({ ...initial.revisions });
  const queues = useRef<Record<string, Promise<boolean>>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const latest = useRef(answers);
  const mounted = useRef(true);

  useEffect(() => { latest.current = answers; }, [answers]);
  useEffect(() => {
    mounted.current = true;
    const pending = timers.current;
    return () => {
      mounted.current = false;
      Object.values(pending).forEach(clearTimeout);
    };
  }, []);

  const saveAnswer = useCallback((itemId: string, rawValue?: string): Promise<boolean> => {
    clearTimeout(timers.current[itemId]);
    const value = (rawValue ?? latest.current[itemId] ?? '').trim();
    const run = async () => {
      if (!value || savedValues.current[itemId] === value) return true;
      if (mounted.current) setSaveStates((current) => ({ ...current, [itemId]: 'saving' }));
      try {
        const response = await saveAttemptAnswer(attemptId, itemId, value, revisions.current[itemId] ?? 0);
        revisions.current[itemId] = response.revision;
        savedValues.current[itemId] = value;
        if (mounted.current) setSaveStates((current) => ({ ...current, [itemId]: 'saved' }));
        return true;
      } catch {
        if (mounted.current) setSaveStates((current) => ({ ...current, [itemId]: 'error' }));
        return false;
      }
    };
    const next = (queues.current[itemId] ?? Promise.resolve(true)).then(run);
    queues.current[itemId] = next;
    return next;
  }, [attemptId]);

  /** Sets an answer; a choice is saved at once, typed text after a short pause (or on blur). */
  const setAnswer = useCallback((itemId: string, value: string, mode: 'now' | 'debounce' = 'now') => {
    setAnswers((current) => ({ ...current, [itemId]: value }));
    latest.current = { ...latest.current, [itemId]: value };
    clearTimeout(timers.current[itemId]);
    if (mode === 'now') void saveAnswer(itemId, value);
    else timers.current[itemId] = setTimeout(() => { void saveAnswer(itemId, value); }, 800);
  }, [saveAnswer]);

  /** Saves every answer the server does not hold yet; false when one still fails. */
  const flushAll = useCallback(async () => {
    const ids = Object.keys(latest.current);
    const results = await Promise.all(ids.map((id) => saveAnswer(id)));
    return results.every(Boolean);
  }, [saveAnswer]);

  const failed = Object.values(saveStates).filter((state) => state === 'error').length;
  const saving = Object.values(saveStates).some((state) => state === 'saving');

  return { answers, saveStates, setAnswer, saveAnswer, flushAll, failed, saving };
}
