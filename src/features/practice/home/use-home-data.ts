import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { profileApi, profileQueryKeys } from '@/src/features/profile/api';
import { ApiError } from '@/src/lib/api-client';
import { serverNow } from '@/src/lib/server-clock';

import { getReadingAttempt } from '../api/attempts';
import { loadBankHistory, loadFreeHistory } from '../model/history-loaders';
import type { HistoryRow } from '../model/history-view';
import { forgetAttempt, readResume, type ResumeEntry } from '../model/resume-store';
import type { SkillType } from '../model/types';

const LOADERS: Record<SkillType, () => Promise<{ rows: HistoryRow[] }>> = {
  // Only the latest result shows, so one attempt (and one title lookup) is enough; Writing and Speaking keep a page
  // because their rows also feed the pending-grading list.
  listening: () => loadBankHistory('LISTENING', 0, 1),
  reading: () => loadBankHistory('READING', 0, 1),
  writing: () => loadFreeHistory('WRITING', 0),
  speaking: () => loadFreeHistory('SPEAKING', 0),
};
/** The server closes a timed practice attempt 30 seconds after its deadline; the status only changes on the next submit, so the deadline is checked here. */
function pastDeadline(attempt: { mode?: string; expiresAt?: string | null }) {
  const deadline = attempt.mode === 'TIMED' && attempt.expiresAt ? Date.parse(attempt.expiresAt) : NaN;
  return Number.isFinite(deadline) && serverNow() >= deadline + 30_000;
}

export const HOME_SKILLS: readonly SkillType[] = ['listening', 'reading', 'writing', 'speaking'];

/**
 * What the practice home shows: the learner's name and target band, the test left in progress on this device, and the
 * latest submission of each skill (its score, or that it is still being graded).
 */
export function useHomeData(signedIn: boolean) {
  const profile = useQuery({ queryKey: profileQueryKeys.learner, queryFn: profileApi.getLearnerProfile, enabled: signedIn, staleTime: 300_000 });
  const [resume, setResume] = useState<ResumeEntry | null>(null);
  useFocusEffect(useCallback(() => { void readResume().then(setResume); }, []));
  const resumeAttempt = useQuery({
    queryKey: ['practice', 'attempt', resume?.attemptId],
    queryFn: ({ signal }) => getReadingAttempt(resume!.attemptId, signal),
    enabled: signedIn && Boolean(resume),
    staleTime: 10_000,
    retry: false,
  });
  const latest = useQueries({
    queries: HOME_SKILLS.map((skill) => ({
      queryKey: ['practice', 'home-latest', skill],
      queryFn: async () => (await LOADERS[skill]()).rows,
      enabled: signedIn,
      staleTime: 60_000,
      retry: 1,
    })),
  });
  const latestBySkill = Object.fromEntries(HOME_SKILLS.map((skill, index) => [skill, latest[index]])) as Record<SkillType, (typeof latest)[number]>;
  const pending = [...(latest[2]?.data ?? []), ...(latest[3]?.data ?? [])].filter((row) => row.tone === 'wait').slice(0, 3);

  // A test left in progress that was submitted elsewhere (or expired) is no longer offered on this device.
  useEffect(() => {
    const gone = resumeAttempt.error instanceof ApiError && resumeAttempt.error.status === 404;
    if (resume && (gone || (resumeAttempt.data && (resumeAttempt.data.status !== 'IN_PROGRESS' || pastDeadline(resumeAttempt.data))))) void forgetAttempt(resume.attemptId);
  }, [resume, resumeAttempt.data, resumeAttempt.error]);

  // The home tab stays mounted, so coming back to it reads again what went stale meanwhile: the latest results and
  // pending grading, and the test left in progress.
  const client = useQueryClient();
  useFocusEffect(useCallback(() => {
    if (!signedIn) return;
    for (const queryKey of [['practice', 'home-latest'], ['practice', 'attempt']]) {
      void client.refetchQueries({ queryKey, type: 'active', stale: true });
    }
  }, [signedIn, client]));

  const refresh = () => Promise.all([profile.refetch(), ...(resume ? [resumeAttempt.refetch()] : []), ...latest.map((query) => query.refetch())]);
  const refreshing = profile.isRefetching || resumeAttempt.isRefetching || latest.some((query) => query.isRefetching);

  return {
    name: profile.data?.displayName?.trim() || null,
    targetBand: profile.data?.selfReportedBand ?? null,
    resume: resume && resumeAttempt.data?.status === 'IN_PROGRESS' && !pastDeadline(resumeAttempt.data) ? resume : null,
    latestBySkill,
    pending,
    refresh,
    refreshing,
  };
}
