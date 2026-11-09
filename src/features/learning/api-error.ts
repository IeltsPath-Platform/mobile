import type { LearningErrorBody, ReviewRefDto } from './types';

export type LearningErrorCode =
  | 'TOPIC_LOCKED'
  | 'LESSON_LOCKED'
  | 'TEST_LOCKED'
  | 'TEST_UNAVAILABLE'
  | 'REVIEW_REQUIRED'
  | 'REVIEW_SET_CLOSED'
  | 'LESSON_HAS_EXERCISES'
  | 'REQUEST_CONFLICT'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR';

export class LearningApiError extends Error {
  readonly status: number;
  readonly code: LearningErrorCode;
  readonly reviews: ReviewRefDto[];

  constructor(status: number, code: LearningErrorCode, message: string, reviews: ReviewRefDto[] = []) {
    super(message);
    this.name = 'LearningApiError';
    this.status = status;
    this.code = code;
    this.reviews = reviews;
  }
}

export function isLearningApiError(error: unknown): error is LearningApiError {
  return error instanceof LearningApiError;
}

export function learningErrorFromBody(status: number, body: LearningErrorBody | null): LearningApiError {
  const code = (body?.code as LearningErrorCode) || (status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR');
  return new LearningApiError(status, code, body?.detail || 'Có lỗi xảy ra.', body?.reviews ?? []);
}
