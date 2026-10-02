import { Platform } from 'react-native';

import { USE_MOCK_LEARNING } from '@/src/lib/env';

import { createHttpLearningApi } from './http-learning-api';
import type { LearningApi, MockLearningControls } from './learning-api';
import { createMockLearningApi } from './mock/mock-learning-api';

const mockApi = createMockLearningApi();
const httpApi = createHttpLearningApi();

export const learningApi: LearningApi & Partial<MockLearningControls> = USE_MOCK_LEARNING
  ? mockApi
  : httpApi;

export function resetMockLearning() {
  if (USE_MOCK_LEARNING && 'reset' in mockApi) mockApi.reset();
}

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

export const learningClientMode = USE_MOCK_LEARNING ? 'mock' : `http(${Platform.OS})`;
