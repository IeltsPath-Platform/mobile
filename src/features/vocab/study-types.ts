export type UnitStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
export type UnitSummary = {
  unitId: string; topicId: string; revision: number; title: string; description: string | null;
  sortOrder: number; kind: 'LEARN' | 'REVIEW'; wordCount: number; estimatedMinutes: number;
  exerciseTypes: ('CHOICE' | 'MATCH' | 'FILL')[];
};
export type TopicUnits = { topicId: string; curriculumVersion: number; totalUnits: number; uniqueWordCount: number; items: UnitSummary[] };
export type StudyWord = {
  vocabularyItemId: string; vocabularySenseId: string; sortOrder: number; lemma: string;
  partOfSpeech: string | null; vietnameseMeaning: string | null; englishDefinition: string | null;
  ipaUk: string | null; ipaUs: string | null; audioUkUrl: string | null; audioUsUrl: string | null;
  imageUrl: string | null; exampleSentence: string | null; exampleTranslationVi: string | null;
};
export type UnitContent = { unit: UnitSummary; introductionVi: string | null; words: StudyWord[] };
export type UnitProgress = {
  unitId: string; status: UnitStatus; prerequisiteUnitId: string | null; currentAttemptId: string | null;
  completedStepCount: number; totalStepCount: number; firstCompletedAt: string | null;
  lastCompletedAt: string | null; bestAccuracyPercent: number | null;
};
export type TopicProgress = {
  topicId: string; curriculumVersion: number; totalUnits: number; completedUnits: number;
  currentUnitId: string | null; units: UnitProgress[]; updatedAt: string;
};
export type StudyHearts = { hearts: number; maxHearts: number; nextHeartAt: string | null; refillCost: number };
export type StudyStreak = {
  currentDays: number; longestDays: number; lastQualifiedDate: string | null; qualifiedToday: boolean;
  freezeAvailable: boolean; freezeCost: number | null; freezeBlockedReason: 'ALREADY_OWNED' | 'NO_STREAK' | 'LIMIT' | null;
  lostStreakDays: number; timezone: string;
};
export type StudySummary = {
  xp: { totalXp: number; level: number; nextLevelAt: number; xpToNextLevel: number };
  streak: StudyStreak; hearts: StudyHearts;
};
export type StudyOption = { optionId: string; text: string; imageUrl?: string | null };
type StepBase = { stepId: string; order: number; instructionVi: string; imageUrl: string | null; audioUrl: string | null };
export type StudyStep = StepBase & (
  | { type: 'WORD'; word: StudyWord }
  | { type: 'CHOICE'; prompt: string; options: StudyOption[] }
  | { type: 'MATCH'; left: StudyOption[]; right: StudyOption[] }
  | { type: 'FILL'; prompt: string; sentenceBefore: string | null; sentenceAfter: string | null; inputMode: 'TEXT'; options: null }
);
export type StudyAnswer =
  | { type: 'WORD'; acknowledged: true }
  | { type: 'CHOICE'; optionId: string }
  | { type: 'MATCH'; pairs: { leftOptionId: string; rightOptionId: string }[] }
  | { type: 'FILL_TEXT'; text: string };
export type StepResult = {
  attemptId: string; stepId: string; submissionId: string; outcome: 'ACKNOWLEDGED' | 'CORRECT' | 'INCORRECT';
  correctAnswer: StudyAnswer | null; explanationVi: string | null; stepCompleted: boolean;
  completedStepCount: number; totalStepCount: number; nextStepId: string | null; canComplete: boolean;
  heartLost: boolean; hearts: StudyHearts | null;
};
export type StudyCompletion = {
  attemptId: string; unitId: string; topicId: string; completedAt: string; studiedWordCount: number;
  gradedStepCount: number; firstTryCorrectCount: number; accuracyPercent: number; durationSeconds: number;
  firstCompletion: boolean; topicProgress: TopicProgress; unlockedUnitIds: string[]; nextUnitId: string | null;
  reward?: { xpEarned: number; xpBreakdown: { firstCompletion: number; perfectBonus: number }; leveledUp: boolean; streakIncreased: boolean; summary: StudySummary } | null;
};
export type StudyAttempt = {
  attemptId: string; topicId: string; unitId: string; revision: number; status: 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';
  mode: 'FIRST_COMPLETION' | 'REPLAY'; startedAt: string; expiresAt: string; currentStepId: string | null;
  completedStepIds: string[]; steps: StudyStep[]; completion: StudyCompletion | null;
};
export type StartMode = 'RESUME_OR_START' | 'REPLAY';
export type RefillResult = { hearts: StudyHearts; pointsSpent: number; pointsBalanceAfter: number };
export type FreezeResult = { streak: StudyStreak; pointsSpent: number; pointsBalanceAfter: number };
