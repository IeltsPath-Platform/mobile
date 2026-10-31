import type {
  ExerciseSubmissionRequest,
  ExerciseSubmissionResultDto,
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

/** Learner learning-path API — paths under `/api/learning/**`. */
export interface LearningApi {
  listTopics(): Promise<TopicSummaryDto[]>;
  getTopicLessons(topicId: string): Promise<TopicLessonsDto>;
  getLesson(lessonId: string): Promise<LessonDetailDto>;
  submitExercise(
    lessonId: string,
    blockId: string,
    request: ExerciseSubmissionRequest,
  ): Promise<ExerciseSubmissionResultDto>;
  completeLesson(lessonId: string): Promise<LessonCompletionDto>;
  getPendingReviews(): Promise<ReviewRefDto[]>;
  getReview(reviewId: string): Promise<ReviewDetailDto>;
  submitReview(reviewId: string, request: ReviewSubmissionRequest): Promise<ReviewSubmissionResultDto>;
  createTestAssignment(topicId: string): Promise<TestAssignmentDto>;
}
