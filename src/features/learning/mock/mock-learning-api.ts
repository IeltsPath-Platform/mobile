import { LearningApiError } from '../api-error';
import type { LearningApi, MockLearningControls } from '../learning-api';
import type {
  ExerciseSubmissionResultDto,
  LessonDetailDto,
  LessonStatus,
  ReviewDetailDto,
  ReviewRefDto,
  TestAssignmentDto,
  TopicLessonsDto,
  TopicStatus,
  TopicSummaryDto,
} from '../types';
import {
  ANSWER_KEY,
  L1,
  L1_EX,
  L2,
  MOCK_LESSON_L1,
  MOCK_LESSON_L2,
  MOCK_TOPIC_SEED,
  Q1,
  Q2,
  Q3,
  REVIEW_1,
  REVIEW_SET_1,
  RQ1,
  TOPIC_DEMO,
  TOPIC_TFNG,
} from './seed';

type Progress = {
  completedLessons: Set<string>;
  passedBlocks: Set<string>;
  pendingReviews: ReviewRefDto[];
  reviewDone: boolean;
  testPassed: boolean;
  processed: Record<string, unknown>;
};

function createProgress(): Progress {
  return {
    completedLessons: new Set(),
    passedBlocks: new Set(),
    pendingReviews: [],
    reviewDone: false,
    testPassed: false,
    processed: {},
  };
}

function cloneLesson(lesson: LessonDetailDto, status: LessonStatus): LessonDetailDto {
  return {
    ...lesson,
    status,
    blocks: lesson.blocks.map((b) => ({
      ...b,
      questions: b.questions?.map((q) => ({ ...q, options: q.options ? q.options.map((o) => ({ ...o })) : null })),
      solutions: b.solutions ? b.solutions.map((s) => ({ ...s })) : undefined,
    })),
  };
}

export function createMockLearningApi(): LearningApi & MockLearningControls {
  let progress = createProgress();

  function topics(): TopicSummaryDto[] {
    const l1Done = progress.completedLessons.has(L1);
    const l2Done = progress.completedLessons.has(L2);
    const demoStatus: TopicStatus = progress.testPassed
      ? 'PASSED'
      : 'IN_PROGRESS';
    return [
      {
        ...MOCK_TOPIC_SEED[0],
        status: demoStatus,
        completedLessonCount: [l1Done, l2Done].filter(Boolean).length,
      },
      {
        ...MOCK_TOPIC_SEED[1],
        status: progress.testPassed ? 'IN_PROGRESS' : 'LOCKED',
        completedLessonCount: 0,
      },
    ];
  }

  function lessonStatus(id: string): LessonStatus {
    if (progress.completedLessons.has(id)) return 'COMPLETED';
    if (id === L1) return 'AVAILABLE';
    if (id === L2 && progress.completedLessons.has(L1) && progress.pendingReviews.length === 0) return 'AVAILABLE';
    return 'LOCKED';
  }

  return {
    async listTopics() {
      return topics();
    },

    async getTopicLessons(topicId) {
      if (topicId === TOPIC_TFNG && !progress.testPassed) {
        throw new LearningApiError(403, 'TOPIC_LOCKED', 'Topic is locked');
      }
      if (topicId !== TOPIC_DEMO && topicId !== TOPIC_TFNG) {
        throw new LearningApiError(404, 'NOT_FOUND', 'Topic was not found');
      }
      const lessons =
        topicId === TOPIC_DEMO
          ? [
              { lessonId: L1, code: 'L1', title: MOCK_LESSON_L1.title, sortOrder: 1, status: lessonStatus(L1) },
              { lessonId: L2, code: 'L2', title: MOCK_LESSON_L2.title, sortOrder: 2, status: lessonStatus(L2) },
            ]
          : [];
      const allDone = lessons.every((l) => l.status === 'COMPLETED');
      const testStatus =
        progress.testPassed ? 'PASSED' : allDone && progress.pendingReviews.length === 0 ? 'AVAILABLE' : 'LOCKED';
      const dto: TopicLessonsDto = { topicId, lessons, testStatus };
      return dto;
    },

    async getLesson(lessonId) {
      if (progress.pendingReviews.length > 0 && lessonId !== L1) {
        throw new LearningApiError(403, 'REVIEW_REQUIRED', 'Complete the pending review first', [
          ...progress.pendingReviews,
        ]);
      }
      if (lessonId === L2 && !progress.completedLessons.has(L1)) {
        throw new LearningApiError(403, 'LESSON_LOCKED', 'Complete L1 before L2');
      }
      const base = lessonId === L1 ? MOCK_LESSON_L1 : lessonId === L2 ? MOCK_LESSON_L2 : null;
      if (!base) throw new LearningApiError(404, 'NOT_FOUND', 'Lesson was not found');
      const lesson = cloneLesson(base, lessonStatus(lessonId));
      lesson.blocks = lesson.blocks.map((b) => {
        if (b.blockType === 'EXERCISE' && progress.passedBlocks.has(b.blockId)) {
          return {
            ...b,
            passed: true,
            solutions: (b.questions ?? []).map((q) => ({
              questionVersionId: q.questionVersionId,
              correctAnswer: ANSWER_KEY[q.questionVersionId]?.correct ?? '',
              explanation: ANSWER_KEY[q.questionVersionId]?.explanation ?? '',
            })),
          };
        }
        return b;
      });
      return lesson;
    },

    async submitExercise(lessonId, blockId, request) {
      if (request.requestId in progress.processed) {
        return progress.processed[request.requestId] as ExerciseSubmissionResultDto;
      }
      if (lessonId !== L1 || blockId !== L1_EX) {
        throw new LearningApiError(404, 'NOT_FOUND', 'Exercise block not found');
      }
      const required = [Q1, Q2, Q3];
      const map = new Map(request.answers.map((a) => [a.questionVersionId, a.answer.trim()]));
      if (required.some((id) => !map.has(id))) {
        throw new LearningApiError(422, 'VALIDATION_FAILED', 'Missing answers');
      }
      const results = required.map((id) => {
        const expected = ANSWER_KEY[id].correct;
        const got = (map.get(id) ?? '').toLowerCase();
        const correct = got === expected.toLowerCase();
        return { questionVersionId: id, correct };
      });
      const score = results.filter((r) => r.correct).length / results.length;
      const blockPassed = score >= 0.7;
      let lessonCompleted = false;
      if (blockPassed) {
        progress.passedBlocks.add(blockId);
        progress.completedLessons.add(L1);
        lessonCompleted = true;
        // Demo: fail Q2 once → spawn review (if any incorrect)
        if (results.some((r) => !r.correct)) {
          progress.pendingReviews = [
            { reviewId: REVIEW_1, lessonId: L1, knowledgePointId: 'kp-demo' },
          ];
        }
        const withSolutions = results.map((r) => ({
          ...r,
          correctAnswer: ANSWER_KEY[r.questionVersionId].correct,
          explanation: ANSWER_KEY[r.questionVersionId].explanation,
        }));
        const out: ExerciseSubmissionResultDto = {
          blockPassed: true,
          lessonCompleted,
          results: withSolutions,
        };
        progress.processed[request.requestId] = out;
        return out;
      }
      const out: ExerciseSubmissionResultDto = { blockPassed: false, lessonCompleted: false, results };
      progress.processed[request.requestId] = out;
      return out;
    },

    async completeLesson(lessonId) {
      if (lessonId === L1) {
        throw new LearningApiError(409, 'LESSON_HAS_EXERCISES', 'L1 contains exercise blocks');
      }
      if (lessonId === L2 && progress.completedLessons.has(L1)) {
        progress.completedLessons.add(L2);
        return { lessonId, status: 'COMPLETED' as const };
      }
      throw new LearningApiError(403, 'LESSON_LOCKED', 'Lesson locked');
    },

    async getPendingReviews() {
      return [...progress.pendingReviews];
    },

    async getReview(reviewId) {
      if (reviewId !== REVIEW_1) throw new LearningApiError(404, 'NOT_FOUND', 'Review was not found');
      if (progress.reviewDone) {
        return {
          reviewId,
          reviewStatus: 'DONE',
          lessonId: L1,
          theory: ['Ôn lại cách tìm câu chủ đề.'],
          set: null,
        } satisfies ReviewDetailDto;
      }
      return {
        reviewId,
        reviewStatus: 'PENDING',
        lessonId: L1,
        theory: [
          'Ý chính đoạn thường ở câu đầu. Tránh chọn câu chỉ là ví dụ chi tiết.',
        ],
        set: {
          reviewSetId: REVIEW_SET_1,
          packageId: 'pkg-1',
          packageVersionId: 'pkgv-1',
          passage: 'Urban beekeeping is growing, with benefits and risks for wild bees.',
          questions: [
            {
              questionVersionId: RQ1,
              sortOrder: 1,
              stem: 'What is the passage mainly about?',
              options: [
                { optionKey: 'A', content: 'City honey tastes better', sortOrder: 1 },
                { optionKey: 'B', content: 'Urban beekeeping is growing, with benefits and risks', sortOrder: 2 },
                { optionKey: 'C', content: 'Wild bees are disappearing from London', sortOrder: 3 },
              ],
            },
          ],
        },
      };
    },

    async submitReview(reviewId, request) {
      if (request.requestId in progress.processed) {
        return progress.processed[request.requestId] as import('../types').ReviewSubmissionResultDto;
      }
      if (reviewId !== REVIEW_1 || request.reviewSetId !== REVIEW_SET_1) {
        throw new LearningApiError(409, 'REVIEW_SET_CLOSED', 'Review set is closed');
      }
      const answer = request.answers.find((a) => a.questionVersionId === RQ1)?.answer ?? '';
      const correct = answer.toUpperCase() === 'B';
      const reviewStatus = correct ? 'DONE' : 'PENDING';
      if (correct) {
        progress.reviewDone = true;
        progress.pendingReviews = [];
      }
      const out = {
        reviewStatus: reviewStatus as 'DONE' | 'PENDING',
        results: [
          {
            questionVersionId: RQ1,
            correct,
            ...(correct
              ? { correctAnswer: 'B', explanation: ANSWER_KEY[RQ1].explanation }
              : {}),
          },
        ],
      };
      progress.processed[request.requestId] = out;
      return out;
    },

    async createTestAssignment(topicId) {
      if (topicId !== TOPIC_DEMO) throw new LearningApiError(404, 'NOT_FOUND', 'Topic was not found');
      if (!progress.completedLessons.has(L1) || !progress.completedLessons.has(L2)) {
        throw new LearningApiError(403, 'TEST_LOCKED', 'Complete the topic lessons first');
      }
      if (progress.pendingReviews.length > 0) {
        throw new LearningApiError(403, 'REVIEW_REQUIRED', 'Complete the pending review first', [
          ...progress.pendingReviews,
        ]);
      }
      const dto: TestAssignmentDto = {
        assignmentId: '20000000-0000-4000-8000-000000000951',
        packageId: '20000000-0000-4000-8000-000000000301',
        packageVersionId: '20000000-0000-4000-8000-000000000401',
      };
      // Mobile MVP: mark test passed when assignment created (assessment HTTP later).
      progress.testPassed = true;
      return dto;
    },

    reset() {
      progress = createProgress();
    },
  };
}
