import { createHttpLearningApi } from './http-learning-api';
import type { LearningApi } from './learning-api';

export const learningApi: LearningApi = createHttpLearningApi();

export { LearningApiError, isLearningApiError } from './api-error';
export type { LearningApi } from './learning-api';
export type {
  TopicSummaryDto,
  TopicLessonsDto,
  LessonDetailDto,
  LessonStatus,
  TopicStatus,
  TestStatus,
  ReviewDetailDto,
  ReviewRefDto,
} from './types';
