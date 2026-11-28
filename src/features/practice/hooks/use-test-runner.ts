import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { ApiError } from '@/src/lib/api-client';
import { haptics } from '@/src/lib/haptics';
import { serverNow } from '@/src/lib/server-clock';

import { getAttemptStructure, startAttemptSection, submitReadingAttempt, type ReadingAttempt } from '../api/attempts';
import type { NavQuestion } from '../components/question-nav';
import { forgetAttempt } from '../model/resume-store';
import { clockSeconds, numberItems, type SavedResponse, type TestSection } from '../model/sections';
import { useAttemptAnswers } from './use-attempt-answers';

/**
 * Everything a Reading or Listening test screen shares: answers with autosave, one numbering across sections, flags,
 * the open section, the clock (counting up in practice, down in the timed exam with auto-submit), the seconds spent per
 * section and the submit that saves what is left and opens the result.
 */
export function useTestRunner({ attemptId, attempt, sections, saved, skill, onFinish }: {
  attemptId: string;
  attempt: ReadingAttempt;
  sections: TestSection[];
  saved: SavedResponse[];
  skill: 'reading' | 'listening';
  /** Replaces the submit and the result page: a placement hands in only this skill, then returns to its hub. */
  onFinish?: () => Promise<void>;
}) {
  const client = useQueryClient();
  const timed = attempt.mode === 'TIMED';
  const answers = useAttemptAnswers(attemptId, saved);
  const { numberByItem, items } = useMemo(() => numberItems(sections), [sections]);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, sections.findIndex((section) => !section.completedAt)));
  const [currentId, setCurrentId] = useState<string | null>(() => items[0]?.item.id ?? null);
  const [flagged, setFlagged] = useState<ReadonlySet<string>>(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  // The server closed the attempt (its time ran out before a submit): nothing can be submitted or graded any more.
  const [closed, setClosed] = useState(false);
  const submittingRef = useRef(false);
  const spent = useRef<Record<string, number>>({});
  const activeSectionId = useRef(sections[activeIndex]?.id);
  useLayoutEffect(() => { activeSectionId.current = sections[activeIndex]?.id; });

  // The first open section is marked started on the server, as the web app does.
  useEffect(() => {
    const first = sections[activeIndex];
    if (first && !first.startedAt) void startAttemptSection(attemptId, first.id).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  // Seconds spent count only while the app is in the foreground, against the open section.
  useEffect(() => {
    const timer = setInterval(() => {
      const open = activeSectionId.current;
      if (open && AppState.currentState === 'active') spent.current[open] = (spent.current[open] ?? 0) + 1;
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const submit = useCallback(async () => {
    if (submittingRef.current) return false;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    let savedAll = await answers.flushAll();
    // A placement hands its sections in one by one; after a hand-in cut short, the sections already handed in are
    // locked and refuse edits. Their answers are kept as the server has them, so only the open sections must save.
    if (!savedAll && onFinish) {
      const locked = await lockedItemIds(attemptId).catch(() => null);
      if (locked?.size) {
        answers.forget(locked);
        savedAll = await answers.flushAll();
      }
    }
    if (!savedAll && !timed) {
      setSubmitError('Một số câu chưa lưu được. Kiểm tra mạng rồi thử nộp lại.');
      setSubmitting(false);
      submittingRef.current = false;
      return false;
    }
    try {
      if (onFinish) {
        await onFinish();
        haptics.success();
        return true;
      }
      await submitReadingAttempt(attemptId, spent.current);
      haptics.success();
      void forgetAttempt(attemptId);
      void client.invalidateQueries({ queryKey: ['practice'] });
      router.replace({ pathname: '/practice/result/[attemptId]', params: { attemptId, skill } } as never);
      return true;
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'ATTEMPT_EXPIRED') {
        void forgetAttempt(attemptId);
        void client.invalidateQueries({ queryKey: ['practice'] });
        setClosed(true);
        setSubmitting(false);
        return false;
      }
      setSubmitError(cause instanceof Error && cause.message ? cause.message : 'Chưa nộp được bài. Hãy thử lại.');
      setSubmitting(false);
      submittingRef.current = false;
      return false;
    }
  }, [answers, attemptId, client, skill, timed, onFinish]);

  const submitRef = useRef(submit);
  useLayoutEffect(() => { submitRef.current = submit; });

  /** Read by the header clock, which ticks on its own so the passage and questions do not re-render every second. */
  const readClock = useCallback(() => clockSeconds(attempt, timed), [attempt, timed]);

  // The exam submits itself at the server deadline, as the web app does. Without a deadline nothing is submitted:
  // a missing `expiresAt` reads as 0 seconds left and must not end the test the moment it opens.
  const [expired, setExpired] = useState(false);
  const deadline = timed && attempt.expiresAt ? Date.parse(attempt.expiresAt) : NaN;
  useEffect(() => {
    if (!Number.isFinite(deadline)) return;
    let done = false;
    const check = () => {
      if (done || serverNow() < deadline) return;
      done = true;
      setExpired(true);
      void submitRef.current();
    };
    check();
    const timer = setInterval(check, 1000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') check(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [deadline]);

  const selectSection = useCallback((index: number) => {
    const target = sections[index];
    if (!target || index === activeIndex) return;
    // Switching tabs is navigation: completing a section would lock its answers on the server.
    void startAttemptSection(attemptId, target.id).catch(() => undefined);
    setActiveIndex(index);
    const first = items.find((entry) => entry.sectionIndex === index);
    if (first) setCurrentId(first.item.id);
  }, [sections, activeIndex, attemptId, items]);

  /** Moves to a question, opening its section first when needed. */
  const goTo = useCallback((itemId: string) => {
    const target = items.find((entry) => entry.item.id === itemId);
    if (!target) return;
    if (target.sectionIndex !== activeIndex) selectSection(target.sectionIndex);
    setCurrentId(itemId);
  }, [items, activeIndex, selectSection]);

  const toggleFlag = useCallback((itemId: string) => {
    haptics.tap();
    setFlagged((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  }, []);

  const navQuestions = useMemo<NavQuestion[]>(() => items.map(({ item, sectionIndex, number }) => ({
    id: item.id, number, sectionIndex, answered: Boolean(answers.answers[item.id]?.trim()), flagged: flagged.has(item.id),
  })), [items, answers.answers, flagged]);
  const unanswered = navQuestions.filter((question) => !question.answered).length;
  const sectionProgress = useMemo(() => sections.map((_, index) => {
    const own = navQuestions.filter((question) => question.sectionIndex === index);
    return { answered: own.filter((question) => question.answered).length, total: own.length };
  }), [sections, navQuestions]);

  return {
    timed, answers, numberByItem, items, navQuestions, unanswered, sectionProgress,
    activeIndex, section: sections[activeIndex], selectSection,
    currentId, setCurrentId, goTo, flagged, toggleFlag,
    readClock, expired, closed, submit, submitting, submitError,
  };
}

/** Items of the sections the server has already closed: their answers can no longer change. */
async function lockedItemIds(attemptId: string) {
  const structure = await getAttemptStructure(attemptId);
  return new Set(structure.sections.filter((section) => section.completedAt).flatMap((section) => section.items.map((item) => item.id)));
}
