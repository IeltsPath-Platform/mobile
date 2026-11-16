// Ported from frontend/src/features/practice/reading/{readingSections,workspace-support}.ts.
import type { AttemptResponse, AttemptStructure as ApiAttemptStructure, ReadingAttempt } from '../api/attempts';
import { parseAttemptStructure, type TestItem, type TestSection } from './attempt-snapshot';

export type { TestItem, TestSection };

/** Turns the structure the API returns into the passages, recordings and questions the test screens draw. */
export function parseSections(structure: ApiAttemptStructure): TestSection[] {
  return parseAttemptStructure({
    sections: structure.sections.map((section) => ({
      ...section,
      snapshot: JSON.stringify(section.snapshot),
      startedAt: section.startedAt ?? null,
      completedAt: section.completedAt ?? null,
      items: section.items.map((item) => ({ ...item, answerSnapshot: null, knowledgeSnapshot: null })),
    })),
  });
}

/** The `answer` a response payload carries (`{"answer": ...}`), or null for any other shape. */
export function answerOf(payload: string): string | null {
  try {
    const value = JSON.parse(payload) as { answer?: unknown };
    return typeof value?.answer === 'string' ? value.answer : null;
  } catch {
    return null;
  }
}

/** Seconds left (timed) or seconds spent (untimed) right now, read from the server times so a resumed clock is right. */
export function clockSeconds(attempt: ReadingAttempt, timed: boolean, now = Date.now()) {
  if (timed) {
    const expiry = attempt.expiresAt ? Date.parse(attempt.expiresAt) : NaN;
    return Number.isFinite(expiry) ? Math.max(0, Math.ceil((expiry - now) / 1000)) : 0;
  }
  const started = attempt.startedAt ? Date.parse(attempt.startedAt) : NaN;
  return Number.isFinite(started) ? Math.max(0, Math.floor((now - started) / 1000)) : 0;
}

/** Every answerable item of the test, in paper order, with its question number (1-based across sections). */
export function numberItems(sections: TestSection[]) {
  const numberByItem = new Map<string, number>();
  const items: Array<{ item: TestItem; sectionIndex: number; number: number }> = [];
  sections.forEach((section, sectionIndex) => {
    for (const item of section.items) {
      if (!item.question) continue;
      const number = items.length + 1;
      numberByItem.set(item.id, number);
      items.push({ item, sectionIndex, number });
    }
  });
  return { numberByItem, items };
}

/** The question groups of one section in paper order; questions outside any known group form a last group. */
export function groupItems(section: TestSection) {
  const items = section.items.filter((item) => item.question !== null);
  const groups = [...(section.snapshot?.groups ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const known = new Set(groups.map((group) => group.groupId));
  const result = groups
    .map((group) => ({ key: group.groupId, formatCode: group.formatCode, instructions: stripQuestionRange(group.instructions), items: items.filter((item) => item.question?.groupId === group.groupId) }))
    .filter((group) => group.items.length > 0);
  const loose = items.filter((item) => !item.question?.groupId || !known.has(item.question.groupId));
  if (loose.length) result.push({ key: 'ungrouped', formatCode: 'OTHER', instructions: '', items: loose });
  return result;
}

/** "Questions 1-3. Do the following…" -> "Do the following…": the numbers are drawn again from the real order. */
export function stripQuestionRange(text: string | null | undefined) {
  return text?.replace(/^Questions?\s+\d+\s*[-–]\s*\d+[.:]?\s*/i, '').trim() ?? '';
}

/** The options every question of a matching group offers, or null when they are not all the same list. */
export function sharedOptions(items: TestItem[]) {
  const first = items[0]?.question?.options;
  if (!first || first.length === 0) return null;
  const key = JSON.stringify(first);
  return items.every((item) => JSON.stringify(item.question?.options) === key) ? first : null;
}

export function rangeLabel(numbers: number[]) {
  if (!numbers.length) return '';
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  return min === max ? `Question ${min}` : `Questions ${min} – ${max}`;
}

export type SavedResponse = Pick<AttemptResponse, 'attemptItemId' | 'payload' | 'revision'>;
