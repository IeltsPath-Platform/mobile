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
  accessLevel?: 'FREE' | 'PREMIUM';
  skill?: string | null;
  hasTopicTest?: boolean;
  course?: {
    courseId: string;
    code: string;
    name: string;
    bandLevel: number | null;
    coverImageUrl: string | null;
    bannerImageUrl?: string | null;
    description?: string | null;
    skillUnlockPoints?: number;
    comboUnlockPoints?: number;
    availableSkills?: string[];
  } | null;
  skills?: string[];
  totalLessonCount?: number;
  description?: string | null;
};

export type LessonSummaryDto = {
  lessonId: string;
  code: string;
  title: string;
  sortOrder: number;
  status: LessonStatus;
  practiceStatus?: string;
  estimatedMinutes?: number | null;
  paywalled?: boolean;
  freePreview?: boolean;
  blockingReviewId?: string | null;
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
  set: (ReviewSetDto & { audio?: { mediaUrl: string; durationSeconds: number | null } | null }) | null;
  stage?: 'THEORY' | 'PRACTICE' | string;
  theoryReason?: string | null;
  theoryScope?: string | null;
  failedSets?: number;
  maxFailedSets?: number | null;
  quickCheck?: QuestionDto[];
  state?: 'ACTIVE' | 'DIAGNOSING' | 'WAITING_ON_PREREQUISITES' | string;
  diagnosticSessionId?: string | null;
  waitingOnReviewIds?: string[];
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

export type ReviewTheoryCheckResultDto = {
  reviewId: string;
  correct: number;
  total: number;
  results: QuestionResultDto[];
  stage: string;
};

export type LearningErrorBody = {
  detail?: string;
  code?: string;
  reviews?: ReviewRefDto[];
};
