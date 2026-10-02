import { apiRequest, ApiError } from '@/src/lib/api-client';

import { LearningApiError, learningErrorFromBody, type LearningErrorCode } from './api-error';
import type { LearningApi } from './learning-api';
import type {
  ExerciseSubmissionRequest,
  ExerciseSubmissionResultDto,
  LearningErrorBody,
  LessonCompletionDto,
  LessonDetailDto,
  ReviewDetailDto,
  ReviewRefDto,
  ReviewSubmissionRequest,
  ReviewSubmissionResultDto,
  TestAssignmentDto,
  TopicLessonsDto,
  TopicSummaryDto,
} from './types';

const PREFIX = '/api/learning';

async function learningRequest<T>(path: string, options: Parameters<typeof apiRequest>[1] = {}): Promise<T> {
  try {
    return await apiRequest<T>(`${PREFIX}${path}`, { ...options, auth: true });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.isNetworkError) {
        throw new LearningApiError(0, 'NETWORK_ERROR', error.message);
      }
      const body: LearningErrorBody = {
        detail: error.message,
        code: (error.details?.code as string) || undefined,
      };
      // ApiError.details is Record<string,string> — reviews may not map; use message/code.
      throw learningErrorFromBody(error.status, {
        detail: error.message,
        code: (error.details.code as LearningErrorCode) || body.code,
      });
    }
    throw error;
  }
}

export function createHttpLearningApi(): LearningApi {
  return {
    listTopics: () => learningRequest<TopicSummaryDto[]>('/topics'),
    getTopicLessons: (topicId) => learningRequest<TopicLessonsDto>(`/topics/${topicId}/lessons`),
    getLesson: (lessonId) => learningRequest<LessonDetailDto>(`/lessons/${lessonId}`),
    submitExercise: (lessonId, blockId, request: ExerciseSubmissionRequest) =>
      learningRequest<ExerciseSubmissionResultDto>(`/lessons/${lessonId}/exercises/${blockId}/submissions`, {
        method: 'POST',
        body: request,
      }),
    completeLesson: (lessonId) =>
      learningRequest<LessonCompletionDto>(`/lessons/${lessonId}/complete`, { method: 'POST', body: {} }),
    getPendingReviews: async () => {
      // Contract focuses on REVIEW_REQUIRED payloads; optional list may 404 — return [].
      try {
        return await learningRequest<ReviewRefDto[]>('/reviews/pending');
      } catch (error) {
        if (error instanceof LearningApiError && (error.status === 404 || error.code === 'NOT_FOUND')) return [];
        throw error;
      }
    },
    getReview: (reviewId) => learningRequest<ReviewDetailDto>(`/reviews/${reviewId}`),
    submitReview: (reviewId, request: ReviewSubmissionRequest) =>
      learningRequest<ReviewSubmissionResultDto>(`/reviews/${reviewId}/submissions`, {
        method: 'POST',
        body: request,
      }),
    createTestAssignment: (topicId) =>
      learningRequest<TestAssignmentDto>(`/topics/${topicId}/test-assignments`, { method: 'POST', body: {} }),
  };
}
