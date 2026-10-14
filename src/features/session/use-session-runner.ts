import { useCallback, useEffect, useReducer, useRef } from 'react';

import { isLearningApiError, learningApi } from '@/src/features/learning';
import type { LearningApiError } from '@/src/features/learning/api-error';
import type { ReviewRefDto } from '@/src/features/learning/types';
import { USE_MOCK_LEARNING } from '@/src/lib/env';

import { sessionFromLesson } from './from-lesson';
import { answersMatch } from './question-kind';
import { localSessionSource } from './mock-questions';
import type { Graded, RunnerState, SessionBlock, SessionSource } from './types';

function newRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function currentBlock(source: SessionSource | null, blockIndex: number): SessionBlock | null {
  return source?.blocks[blockIndex] ?? null;
}

const initialState: RunnerState = {
  status: 'loading',
  source: null,
  index: 0,
  blockIndex: 0,
  draft: '',
  answers: {},
  graded: {},
  feedback: null,
  blockPassed: false,
  lessonCompleted: false,
  submitting: false,
  message: null,
  reviews: [],
  emptyTitle: null,
};

type Action =
  | { type: 'reset' }
  | { type: 'loaded'; source: SessionSource }
  | { type: 'failed'; message: string; reviews: ReviewRefDto[] }
  | { type: 'empty'; title: string }
  | { type: 'draft'; value: string }
  | { type: 'local-feedback'; answer: string; graded: Graded }
  | { type: 'save-advance'; answer: string }
  | { type: 'submitting'; answer: string }
  | { type: 'submitted'; graded: Record<string, Graded>; blockPassed: boolean; lessonCompleted: boolean }
  | { type: 'submit-error'; message: string }
  | { type: 'continue' }
  | { type: 'retry' };

function reducer(state: RunnerState, action: Action): RunnerState {
  const block = currentBlock(state.source, state.blockIndex);

  switch (action.type) {
    case 'reset':
      return { ...initialState };
    case 'loaded':
      return { ...initialState, status: 'answering', source: action.source };
    case 'failed':
      return { ...initialState, status: 'error', message: action.message, reviews: action.reviews };
    case 'empty':
      return { ...initialState, status: 'empty', emptyTitle: action.title };
    case 'draft':
      if (state.status !== 'answering') return state;
      return { ...state, draft: action.value };
    case 'local-feedback': {
      if (!block) return state;
      const question = block.questions[state.index];
      return {
        ...state,
        status: 'feedback',
        draft: action.answer,
        answers: { ...state.answers, [question.id]: action.answer },
        graded: { ...state.graded, [question.id]: action.graded },
        feedback: action.graded,
        submitting: false,
        message: null,
      };
    }
    case 'save-advance': {
      if (!block) return state;
      const question = block.questions[state.index];
      return {
        ...state,
        status: 'answering',
        index: state.index + 1,
        draft: '',
        answers: { ...state.answers, [question.id]: action.answer },
        feedback: null,
        message: null,
      };
    }
    case 'submitting': {
      if (!block) return state;
      const question = block.questions[state.index];
      return {
        ...state,
        submitting: true,
        message: null,
        draft: action.answer,
        answers: { ...state.answers, [question.id]: action.answer },
      };
    }
    case 'submitted': {
      const first = block?.questions[0];
      return {
        ...state,
        status: 'feedback',
        submitting: false,
        index: 0,
        graded: { ...state.graded, ...action.graded },
        blockPassed: action.blockPassed,
        lessonCompleted: action.lessonCompleted,
        feedback: first ? (action.graded[first.id] ?? null) : null,
        draft: first ? (state.answers[first.id] ?? '') : '',
        message: null,
      };
    }
    case 'submit-error':
      return { ...state, submitting: false, message: action.message };
    case 'continue': {
      if (state.status !== 'feedback' || !state.source || !block) return state;
      const next = state.index + 1;
      if (next < block.questions.length) {
        const question = block.questions[next];
        if (state.source.mode === 'api') {
          return {
            ...state,
            index: next,
            status: 'feedback',
            feedback: state.graded[question.id] ?? null,
            draft: state.answers[question.id] ?? '',
          };
        }
        return { ...state, index: next, status: 'answering', draft: '', feedback: null };
      }

      if (state.source.mode === 'local') {
        const correct = Object.values(state.graded).filter((row) => row.correct).length;
        const total = block.questions.length;
        const passed = total > 0 && correct / total >= 0.7;
        return { ...state, status: 'summary', blockPassed: passed, lessonCompleted: passed, feedback: null };
      }

      if (!state.blockPassed) {
        return { ...state, status: 'summary', lessonCompleted: false, feedback: null };
      }

      if (state.blockIndex < state.source.blocks.length - 1) {
        return {
          ...state,
          blockIndex: state.blockIndex + 1,
          index: 0,
          status: 'answering',
          draft: '',
          feedback: null,
          message: null,
          blockPassed: false,
        };
      }

      return { ...state, status: 'summary', feedback: null };
    }
    case 'retry': {
      if (!state.source || !block) return { ...initialState, status: 'answering', source: state.source };
      const graded = { ...state.graded };
      const answers = { ...state.answers };
      for (const question of block.questions) {
        delete graded[question.id];
        delete answers[question.id];
      }
      return {
        ...state,
        status: 'answering',
        index: 0,
        draft: '',
        answers,
        graded,
        feedback: null,
        blockPassed: false,
        lessonCompleted: false,
        submitting: false,
        message: null,
      };
    }
    default:
      return state;
  }
}

function friendly(error: LearningApiError): string {
  if (error.code === 'REVIEW_REQUIRED') return 'Cần làm bài ôn trước khi tiếp tục bài này.';
  if (error.code === 'LESSON_LOCKED' || error.status === 403) {
    return 'Bài đang khóa hoặc cần ôn trước. Hoàn thành bài ôn, rồi quay lại lộ trình.';
  }
  if (error.code === 'NETWORK_ERROR') return 'Không kết nối được. Kiểm tra mạng rồi thử lại.';
  return error.message || 'Không tải được bài.';
}

export function useSessionRunner(lessonId: string) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const requestIdRef = useRef(newRequestId());
  const busyRef = useRef(false);

  useEffect(() => {
    if (!state.submitting) busyRef.current = false;
  }, [state.status, state.index, state.blockIndex, state.submitting]);

  useEffect(() => {
    let cancelled = false;
    requestIdRef.current = newRequestId();
    busyRef.current = false;
    dispatch({ type: 'reset' });

    (async () => {
      try {
        const lesson = await learningApi.getLesson(lessonId);
        if (cancelled) return;
        const built = sessionFromLesson(lesson);
        if (built.blocks.length === 0) {
          dispatch({ type: 'empty', title: lesson.title });
          return;
        }
        dispatch({
          type: 'loaded',
          source: {
            mode: 'api',
            title: lesson.title,
            lessonId: lesson.lessonId,
            blocks: built.blocks,
          },
        });
      } catch (error) {
        if (cancelled) return;
        if (USE_MOCK_LEARNING && isLearningApiError(error) && (error.status === 404 || error.code === 'NOT_FOUND')) {
          dispatch({ type: 'loaded', source: localSessionSource(lessonId) });
          return;
        }
        dispatch({
          type: 'failed',
          message: isLearningApiError(error) ? friendly(error) : 'Không tải được bài.',
          reviews: isLearningApiError(error) ? error.reviews : [],
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const setDraft = useCallback((value: string) => {
    dispatch({ type: 'draft', value });
  }, []);

  const check = useCallback(async () => {
    if (busyRef.current) return;
    const current = stateRef.current;
    const block = currentBlock(current.source, current.blockIndex);
    if (!current.source || !block || current.status !== 'answering' || current.submitting) return;
    const question = block.questions[current.index];
    if (!question) return;
    const answer = current.draft.trim();
    if (!answer) return;

    if (current.source.mode === 'local') {
      busyRef.current = true;
      const expected = current.source.key?.[question.id];
      const correct = expected ? answersMatch(answer, expected.correct) : false;
      dispatch({
        type: 'local-feedback',
        answer,
        graded: {
          correct,
          correctAnswer: expected?.correct,
          explanation: expected?.explanation,
        },
      });
      return;
    }

    const isLast = current.index >= block.questions.length - 1;
    if (!isLast) {
      busyRef.current = true;
      dispatch({ type: 'save-advance', answer });
      return;
    }
    if (!block.blockId) {
      dispatch({ type: 'submit-error', message: 'Bài không có phần trắc nghiệm để nộp.' });
      return;
    }

    const answers = { ...current.answers, [question.id]: answer };
    busyRef.current = true;
    dispatch({ type: 'submitting', answer });
    try {
      const result = await learningApi.submitExercise(current.source.lessonId, block.blockId, {
        requestId: requestIdRef.current,
        answers: block.questions.map((item) => ({
          questionVersionId: item.id,
          answer: answers[item.id] ?? '',
        })),
      });
      const graded: Record<string, Graded> = {};
      for (const row of result.results) {
        graded[row.questionVersionId] = {
          correct: row.correct,
          correctAnswer: row.correctAnswer,
          explanation: row.explanation,
        };
      }
      dispatch({
        type: 'submitted',
        graded,
        blockPassed: result.blockPassed,
        lessonCompleted: result.lessonCompleted,
      });
    } catch (error) {
      requestIdRef.current = newRequestId();
      dispatch({
        type: 'submit-error',
        message: isLearningApiError(error) ? friendly(error) : 'Không nộp được bài.',
      });
    } finally {
      busyRef.current = false;
    }
  }, []);

  const continueNext = useCallback(() => {
    const current = stateRef.current;
    const block = currentBlock(current.source, current.blockIndex);
    const atEnd = Boolean(block && current.index + 1 >= block.questions.length);
    const more = Boolean(current.source && current.blockIndex < current.source.blocks.length - 1);
    if (atEnd && current.blockPassed && more && current.source?.mode === 'api') {
      requestIdRef.current = newRequestId();
    }
    dispatch({ type: 'continue' });
  }, []);

  const retry = useCallback(() => {
    requestIdRef.current = newRequestId();
    busyRef.current = false;
    dispatch({ type: 'retry' });
  }, []);

  const block = currentBlock(state.source, state.blockIndex);
  const question = block?.questions[state.index] ?? null;
  const blockTotal = block?.questions.length ?? 0;
  const prior =
    state.source?.blocks.slice(0, state.blockIndex).reduce((sum, item) => sum + item.questions.length, 0) ?? 0;
  const globalTotal = state.source?.blocks.reduce((sum, item) => sum + item.questions.length, 0) ?? 0;
  const correctCount = Object.values(state.graded).filter((row) => row.correct).length;

  return {
    ...state,
    question,
    blockTotal,
    globalIndex: prior + state.index,
    globalTotal,
    correctCount,
    setDraft,
    check,
    continueNext,
    retry,
  };
}
