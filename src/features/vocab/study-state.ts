import type { StepResult, StudyAttempt } from './study-types';

/** Apply only server-confirmed progress; keep a wrong answer on the same step. */
export function advanceStudyAttempt(attempt: StudyAttempt, result: StepResult): StudyAttempt {
  if (result.attemptId !== attempt.attemptId || result.stepId !== attempt.currentStepId) return attempt;
  return {
    ...attempt,
    currentStepId: result.nextStepId,
    completedStepIds: result.stepCompleted
      ? [...new Set([...attempt.completedStepIds, result.stepId])]
      : attempt.completedStepIds,
  };
}

export function canCompleteStudy(attempt: StudyAttempt | null): boolean {
  return Boolean(attempt && attempt.status === 'IN_PROGRESS' && attempt.steps.length > 0
    && attempt.steps.every((step) => attempt.completedStepIds.includes(step.stepId)));
}

/** A transport/server failure has an unknown result: preserve the operation for retry. */
export function isUncertainStudyWrite(error: unknown): boolean {
  const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
  return typeof status !== 'number' || status === 0 || status === 408 || status >= 500;
}
