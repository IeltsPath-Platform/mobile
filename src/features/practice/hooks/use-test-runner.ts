import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { refreshLearningProgressSoon } from '@/src/features/progress/learning-progress-api';
import { haptics } from '@/src/lib/haptics';

import { completeAttemptSection, startAttemptSection, submitReadingAttempt, type ReadingAttempt } from '../api/attempts';
import type { NavQuestion } from '../components/question-nav';
import { forgetAttempt } from '../model/resume-store';
import { clockSeconds, numberItems, type SavedResponse, type TestSection } from '../model/sections';
import { useAttemptAnswers } from './use-attempt-answers';
import { useTicker } from './use-ticker';

/**
 * Everything a Reading or Listening test screen shares: answers with autosave, one numbering across sections, flags,
 * the open section, the clock (counting up in practice, down in the timed exam with auto-submit), the seconds spent per
 * section and the submit that saves what is left and opens the result.
 */
export function useTestRunner({ attemptId, attempt, sections, saved, skill }: {
  attemptId: string;
  attempt: ReadingAttempt;
  sections: TestSection[];
  saved: SavedResponse[];
  skill: 'reading' | 'listening';
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
  const submittingRef = useRef(false);
  const spent = useRef<Record<string, number>>({});
  const activeSectionId = useRef(sections[activeIndex]?.id);
  activeSectionId.current = sections[activeIndex]?.id;

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
    const savedAll = await answers.flushAll();
    if (!savedAll && !timed) {
      setSubmitError('Một số câu chưa lưu được. Kiểm tra mạng rồi thử nộp lại.');
      setSubmitting(false);
      submittingRef.current = false;
      return false;
    }
    try {
      await submitReadingAttempt(attemptId, spent.current);
      haptics.success();
      void forgetAttempt(attemptId);
      void client.invalidateQueries({ queryKey: ['practice'] });
      refreshLearningProgressSoon(client);
      router.replace({ pathname: '/practice/result/[attemptId]', params: { attemptId, skill } } as never);
      return true;
    } catch (cause) {
      setSubmitError(cause instanceof Error && cause.message ? cause.message : 'Chưa nộp được bài. Hãy thử lại.');
      setSubmitting(false);
      submittingRef.current = false;
      return false;
    }
  }, [answers, attemptId, client, skill, timed]);

  const seconds = useTicker(() => clockSeconds(attempt, timed), { onZero: timed ? () => { void submit(); } : undefined });

  const selectSection = useCallback((index: number) => {
    const target = sections[index];
    if (!target || index === activeIndex) return;
    const previous = sections[activeIndex];
    if (previous && !timed) void completeAttemptSection(attemptId, previous.id).catch(() => undefined);
    void startAttemptSection(attemptId, target.id).catch(() => undefined);
    setActiveIndex(index);
    const first = items.find((entry) => entry.sectionIndex === index);
    if (first) setCurrentId(first.item.id);
  }, [sections, activeIndex, attemptId, items, timed]);

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

  return {
    timed, answers, numberByItem, items, navQuestions, unanswered,
    activeIndex, section: sections[activeIndex], selectSection,
    currentId, setCurrentId, goTo, flagged, toggleFlag,
    seconds, submit, submitting, submitError,
  };
}
