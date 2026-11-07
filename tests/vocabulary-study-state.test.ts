import { describe, expect, it } from 'vitest';
import { advanceStudyAttempt, canCompleteStudy, isUncertainStudyWrite } from '../src/features/vocab/study-state';
import type { StepResult, StudyAttempt, StudyStep } from '../src/features/vocab/study-types';

const choice: StudyStep = { stepId: 'choice', order: 1, type: 'CHOICE', instructionVi: '', imageUrl: null, audioUrl: null, prompt: 'Meaning', options: [{ optionId: 'a', text: 'answer' }] };
const word: StudyStep = { stepId: 'word', order: 0, type: 'WORD', instructionVi: '', imageUrl: null, audioUrl: null, word: { vocabularyItemId: 'v', vocabularySenseId: 's', sortOrder: 0, lemma: 'learn', partOfSpeech: null, vietnameseMeaning: null, englishDefinition: null, ipaUk: null, ipaUs: null, audioUkUrl: null, audioUsUrl: null, imageUrl: null, exampleSentence: null, exampleTranslationVi: null } };
const attempt = (patch: Partial<StudyAttempt> = {}): StudyAttempt => ({ attemptId: 'attempt', topicId: 'topic', unitId: 'unit', revision: 1, status: 'IN_PROGRESS', mode: 'FIRST_COMPLETION', startedAt: '', expiresAt: '', currentStepId: 'word', completedStepIds: [], steps: [word, choice], completion: null, ...patch });
const result = (patch: Partial<StepResult> = {}): StepResult => ({ attemptId: 'attempt', stepId: 'word', submissionId: 'submission', outcome: 'ACKNOWLEDGED', correctAnswer: null, explanationVi: null, stepCompleted: true, completedStepCount: 1, totalStepCount: 2, nextStepId: 'choice', canComplete: false, heartLost: false, hearts: null, ...patch });

describe('server vocabulary study transitions', () => {
  it('acknowledges WORD before permitting graded steps, without mutating the old attempt', () => {
    const before = attempt();
    expect(advanceStudyAttempt(before, result())).toMatchObject({ currentStepId: 'choice', completedStepIds: ['word'] });
    expect(before.completedStepIds).toEqual([]);
    expect(canCompleteStudy(before)).toBe(false);
  });

  it('keeps an incorrect answer on its step and does not mark it complete', () => {
    const next = advanceStudyAttempt(attempt({ currentStepId: 'choice', completedStepIds: ['word'] }), result({ stepId: 'choice', outcome: 'INCORRECT', stepCompleted: false, nextStepId: 'choice', heartLost: true }));
    expect(next.currentStepId).toBe('choice');
    expect(next.completedStepIds).toEqual(['word']);
    expect(canCompleteStudy(next)).toBe(false);
  });

  it('allows completion only after the final correct server response and ignores its duplicate', () => {
    const response = result({ stepId: 'choice', outcome: 'CORRECT', nextStepId: null, canComplete: true, completedStepCount: 2 });
    const next = advanceStudyAttempt(attempt({ currentStepId: 'choice', completedStepIds: ['word'] }), response);
    expect(next.completedStepIds).toEqual(['word', 'choice']);
    expect(canCompleteStudy(next)).toBe(true);
    expect(advanceStudyAttempt(next, response)).toBe(next);
  });

  it('ignores responses belonging to another attempt or a previous step', () => {
    const before = attempt();
    expect(advanceStudyAttempt(before, result({ attemptId: 'old' }))).toBe(before);
    expect(advanceStudyAttempt(before, result({ stepId: 'old' }))).toBe(before);
  });

  it('checks all step IDs on resumed attempts, including unacknowledged WORD steps', () => {
    expect(canCompleteStudy(attempt({ completedStepIds: ['choice'] }))).toBe(false);
    expect(canCompleteStudy(attempt({ completedStepIds: ['word', 'choice'] }))).toBe(true);
    expect(canCompleteStudy(attempt({ completedStepIds: ['word', 'choice'], status: 'COMPLETED' }))).toBe(false);
    expect(canCompleteStudy(attempt({ completedStepIds: ['word', 'choice'], status: 'EXPIRED' }))).toBe(false);
    expect(canCompleteStudy(attempt({ steps: [] }))).toBe(false);
    expect(canCompleteStudy(null)).toBe(false);
  });

  it.each([undefined, 0, 408, 500, 503])('preserves operation identity for unknown write outcome %s', (status) => {
    expect(isUncertainStudyWrite({ status })).toBe(true);
  });
  it.each([400, 401, 403, 404, 409, 422])('treats a definitive business rejection %s separately', (status) => {
    expect(isUncertainStudyWrite({ status })).toBe(false);
  });
});
