import type { QuestionOptionDto, ReviewRefDto } from '@/src/features/learning/types';

export type SessionQuestion = {
  id: string;
  stem: string;
  options: QuestionOptionDto[] | null;
  wordBank?: string[];
  passageExcerpt?: string;
};

export type Graded = {
  correct: boolean;
  correctAnswer?: string;
  explanation?: string;
};

export type SessionBlock = {
  blockId: string | null;
  questions: SessionQuestion[];
};

export type SessionSource = {
  title: string;
  lessonId: string;
  blocks: SessionBlock[];
};

export type RunnerStatus = 'loading' | 'error' | 'empty' | 'answering' | 'feedback' | 'summary';

export type RunnerState = {
  status: RunnerStatus;
  source: SessionSource | null;
  index: number;
  blockIndex: number;
  draft: string;
  answers: Record<string, string>;
  graded: Record<string, Graded>;
  feedback: Graded | null;
  blockPassed: boolean;
  lessonCompleted: boolean;
  submitting: boolean;
  message: string | null;
  reviews: ReviewRefDto[];
  emptyTitle: string | null;
};
