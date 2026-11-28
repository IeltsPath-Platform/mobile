// Ported from frontend/src/features/learning-path/api/httpLearningApi.ts (placement routes). Keep in step with the web.
import { File as ExpoFile } from 'expo-file-system';

import { ApiError, apiRequest } from '@/src/lib/api-client';
import type { ReadingAttempt } from '@/src/features/practice/api/attempts';

export type PlacementPool = 'BAND_0_3' | 'BAND_3_5' | 'BAND_5_9';
export type PlacementSkill = 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';

export interface PlacementAssignment {
  assignmentId: string;
  pool: PlacementPool;
  packageId: string;
  packageVersionId: string;
  retakesLeft: number;
  nextRetakeAt: string | null;
}

export interface PlacementOptions {
  pools: { pool: PlacementPool; examCount: number }[];
  limitPer24h: number;
  retakesLeft: number;
  nextRetakeAt: string | null;
  hasPlacement: boolean;
  currentBand: number | null;
  openAssignment: PlacementAssignment | null;
}

export interface PlacementResult {
  attemptId: string;
  overallBand: number | null;
  completedAt: string | null;
  skills: { skill: PlacementSkill; band: number }[];
  pool: PlacementPool | null;
  ceiling: number | null;
  reachedCeiling: boolean;
  partial: boolean;
  /** In test order; empty from a backend that predates the report. */
  sections: PlacementReportSection[];
  /** Comments from the Speaking grader; absent when the recordings were not graded. */
  speakingFeedback?: { summary: string | null; criteria: { code: string; band: number | null; comment: string | null }[] } | null;
}

export interface PlacementReportSection {
  skill: PlacementSkill;
  title: string | null;
  /** Listening and Reading only. */
  questions: { number: number; prompt: string; learnerAnswer: string | null; correctAnswer: string | null; correct: boolean; explanation: string | null }[];
  /** Writing only. */
  essays: PlacementReportEssay[];
}

export interface PlacementReportEssay {
  task: string | null;
  /** Null while still being graded. */
  band: number | null;
  /** False when the learner handed the section in without an essay. */
  submitted: boolean;
  feedback: { summary: string | null; criteria: { code: string; band: number | null; comment: string | null }[]; focus: string[] } | null;
}

export interface LearningGoal {
  targetBand: number;
  /** ISO date (yyyy-mm-dd) in the future, or null when the learner has not picked one. */
  examDate: string | null;
  availableMinutesPerDay: number;
}

export interface CourseSummary {
  courseId: string;
  name: string;
  description?: string | null;
  bandLevel: number;
  topicCount: number;
  recommended: boolean;
}

const UPLOAD_TIMEOUT_MS = 90_000;

export const placementApi = {
  options: (signal?: AbortSignal) => apiRequest<PlacementOptions>('/api/learning/placement-test/options', { auth: true, signal }),
  assign: (pool: PlacementPool) => apiRequest<PlacementAssignment>('/api/learning/placement-test/assignments', { method: 'POST', auth: true, body: { pool } }),
  release: (assignmentId: string) => apiRequest<void>(`/api/learning/placement-test/assignments/${encodeURIComponent(assignmentId)}/release`, { method: 'POST', auth: true }),
  /** The learner's latest placement attempt, or null (204) when they never started one. */
  current: (signal?: AbortSignal) => apiRequest<ReadingAttempt | null>('/api/assessments/attempts/placement/current', { auth: true, signal }),
  /** The server recognises a placement exam from its package; the client only says it is on a phone. */
  start: (packageVersionId: string) => apiRequest<ReadingAttempt>('/api/assessments/attempts', {
    method: 'POST', auth: true, body: { packageVersionId, mode: 'STANDARD', channel: 'MOBILE' },
  }),
  cancel: (attemptId: string) => apiRequest<void>(`/api/assessments/attempts/${attemptId}/cancel`, { method: 'POST', auth: true }),
  completeSection: (attemptId: string, sectionId: string) =>
    apiRequest<void>(`/api/assessments/attempts/${attemptId}/sections/${sectionId}/complete`, { method: 'POST', auth: true, body: {} }),
  submit: (attemptId: string) => apiRequest<ReadingAttempt>(`/api/assessments/attempts/${attemptId}/submit`, { method: 'POST', auth: true, body: {} }),
  /** 404 until every essay and recording is graded and the attempt completes. */
  result: async (attemptId: string, signal?: AbortSignal) => {
    const result = await apiRequest<PlacementResult>(`/api/assessments/attempts/${attemptId}/placement-result`, { auth: true, signal });
    return { ...result, sections: result.sections ?? [] };
  },
  /** The learner's study goal, or null when none is set (404). */
  goal: async (signal?: AbortSignal) => {
    try {
      return await apiRequest<LearningGoal>('/api/users/me/learning-goals/active', { auth: true, signal });
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) return null;
      throw cause;
    }
  },
  saveGoal: (goal: LearningGoal) => apiRequest<void>('/api/users/me/learning-goals', { method: 'POST', auth: true, body: goal }),
  courses: (signal?: AbortSignal) => apiRequest<CourseSummary[]>('/api/learning/courses', { auth: true, signal }),
  /** Hands an essay or a recording of one item to the grader; the key makes a resend harmless. */
  submitAnswer: (body: { attemptItemId: string; promptSnapshot: string; skill: 'WRITING' | 'SPEAKING'; textPayload?: string; audioReference?: string; submissionKey: string }) =>
    apiRequest<{ id: string }>('/api/assessments/submissions', { method: 'POST', auth: true, body }),
  /**
   * Uploads a WAV answer. Expo SDK 58's fetch reads a multipart part through bytes(), so the part reads the file itself
   * (the same reason as the Speaking practice upload).
   */
  uploadRecording: (wavUri: string) => {
    const wav = new ExpoFile(wavUri);
    const form = new FormData();
    form.append('file', { name: 'speaking-recording.wav', type: 'audio/wav', bytes: () => wav.bytes() } as unknown as Blob);
    return apiRequest<{ mediaReference: string }>('/api/assessments/speaking-recordings', { method: 'POST', auth: true, body: form, timeoutMs: UPLOAD_TIMEOUT_MS });
  },
};
