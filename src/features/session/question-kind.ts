import type { QuestionOptionDto } from '@/src/features/learning/types';

import type { SessionQuestion } from './types';

export type QuestionKind = 'choice' | 'tfng' | 'fill';

function labelOf(option: QuestionOptionDto): string {
  return `${option.optionKey} ${option.content}`.toUpperCase();
}

/** Three-option TRUE / FALSE / NOT GIVEN (or T / F / NG) renders as large TFNG buttons. */
export function isTfngOptions(options: QuestionOptionDto[]): boolean {
  if (options.length !== 3) return false;
  const labels = options.map(labelOf);
  const hasTrue = labels.some((label) => /\b(TRUE|YES)\b/.test(label) || /\bT\b/.test(label));
  const hasFalse = labels.some((label) => /\b(FALSE|NO)\b/.test(label) || /\bF\b/.test(label));
  const hasNg = labels.some(
    (label) => label.includes('NOT GIVEN') || label.includes('NOT_GIVEN') || /\bNG\b/.test(label),
  );
  return hasTrue && hasFalse && hasNg;
}

export function questionKind(question: SessionQuestion): QuestionKind {
  if (!question.options || question.options.length === 0) return 'fill';
  if (isTfngOptions(question.options)) return 'tfng';
  return 'choice';
}

export function answersMatch(given: string, expected: string): boolean {
  return given.trim().toLowerCase() === expected.trim().toLowerCase();
}
