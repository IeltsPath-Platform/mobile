export type TopicStatus = 'PASSED' | 'IN_PROGRESS' | 'LOCKED';
export type LessonStatus = 'LOCKED' | 'AVAILABLE' | 'COMPLETED';
export type TestStatus = 'LOCKED' | 'AVAILABLE' | 'PASSED';
export type ReviewStatus = 'PENDING' | 'DONE' | 'SKIPPED';

/** Wire DTO — matches backend/docs/contracts/lesson-learning-v1.md */

export type TopicSummaryDto = {
  topicId: string;
  code: string;
  name: string;
  sequenceOrder: number;
  status: TopicStatus;
  completedLessonCount: number;
};

export type LessonSummaryDto = {
  lessonId: string;
  code: string;
  title: string;
  sortOrder: number;
  status: LessonStatus;
};

export type TopicLessonsDto = {
  topicId: string;
  lessons: LessonSummaryDto[];
  testStatus: TestStatus;
};

export type QuestionOptionDto = {
  optionKey: string;
  content: string;
  sortOrder: number;
};

export type QuestionDto = {
  questionVersionId: string;
  sortOrder: number;
  stem: string;
  options: QuestionOptionDto[] | null;
};

export type SolutionDto = {
  questionVersionId: string;
  correctAnswer: string;
  explanation: string;
};

export type LessonBlockDto = {
  blockId: string;
  blockType: 'TEXT' | 'ASSET' | 'EXERCISE' | string;
  sortOrder: number;
  passed?: boolean;
  text?: string;
  passageTitle?: string;
  passage?: string;
  questions?: QuestionDto[];
  solutions?: SolutionDto[];
};

export type LessonDetailDto = {
  lessonId: string;
  topicId: string;
  code: string;
  title: string;
  sortOrder: number;
  status: LessonStatus;
  blocks: LessonBlockDto[];
};

export type AnswerDto = { questionVersionId: string; answer: string };

export type ExerciseSubmissionRequest = {
  requestId: string;
  answers: AnswerDto[];
};

export type QuestionResultDto = {
  questionVersionId: string;
  correct: boolean;
  correctAnswer?: string;
  explanation?: string;
};

export type ExerciseSubmissionResultDto = {
  blockPassed: boolean;
  lessonCompleted: boolean;
  results: QuestionResultDto[];
};

export type LessonCompletionDto = {
  lessonId: string;
  status: 'COMPLETED';
};

export type ReviewRefDto = {
  reviewId: string;
  lessonId: string;
  knowledgePointId: string;
};

export type ReviewSetDto = {
  reviewSetId: string;
  packageId: string;
  packageVersionId: string;
  passage?: string;
  questions: QuestionDto[];
  solutions?: SolutionDto[];
};

export type ReviewDetailDto = {
  reviewId: string;
  reviewStatus: ReviewStatus;
  lessonId: string;
  theory: string[];
  set: ReviewSetDto | null;
};

export type ReviewSubmissionRequest = {
  reviewSetId: string;
  requestId: string;
  answers: AnswerDto[];
};

export type ReviewSubmissionResultDto = {
  reviewStatus: ReviewStatus;
  results: QuestionResultDto[];
};

export type TestAssignmentDto = {
  assignmentId: string;
  packageId: string;
  packageVersionId: string;
};

export type LearningErrorBody = {
  detail?: string;
  code?: string;
  reviews?: ReviewRefDto[];
};
