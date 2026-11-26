/**
 * Types the practice screens share. They mirror the web learner app (`frontend/src/types/learningPath.ts` and
 * `frontend/src/types/practice.ts`) for the parts the practice-test flow uses.
 */

export type SkillType = 'reading' | 'listening' | 'writing' | 'speaking';

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  number: number;
  prompt: string;
  options: QuestionOption[] | null;
  hint?: string | null;
  groupId?: string | null;
}

export interface PassageParagraph {
  label: string | null;
  text: string;
}

export interface Passage {
  title: string;
  paragraphs: PassageParagraph[];
}

export interface MediaAudio {
  mediaUrl: string;
  durationSeconds: number | null;
  transcript?: string | null;
}

export interface SectionSnapshot {
  title: string;
  instructions: string;
  skill?: string;
  passage: Passage | null;
  audio: MediaAudio | null;
  partNo?: number | null;
  groups?: { groupId: string; sortOrder: number; formatCode: string; instructions: string | null }[];
}

/** Attempt structure with each snapshot still as JSON text, the shape the snapshot parser reads. */
export interface AttemptStructure {
  sections: {
    id: string;
    contentSectionId: string;
    sortOrder: number;
    snapshot: string;
    startedAt: string | null;
    completedAt: string | null;
    partNo?: number | null;
    items: { id: string; questionVersionId: string; sortOrder: number; questionSnapshot: string; answerSnapshot: string | null; knowledgeSnapshot: string | null }[];
  }[];
}

export type EssayJudgment = 'PASS' | 'FAIL' | 'NOT_ASSESSED';

export interface EssayKnowledgeJudgment {
  knowledgePointId: string;
  code: string | null;
  name: string | null;
  judgment: EssayJudgment;
  excerpt: string | null;
  reason: string | null;
}

export interface EssayStudyPoint {
  kind: 'CRITERION' | 'KNOWLEDGE_POINT' | 'AI';
  criterionCode: string | null;
  band: number | null;
  knowledgePointId: string | null;
  code: string | null;
  name: string | null;
  title: string | null;
  reason: string | null;
  excerpt?: string | null;
  practiceKnowledgePointId?: string | null;
}

export type EssayKnowledgeJudgmentDto = {
  knowledgePointId?: string;
  code?: string | null;
  name?: string | null;
  judgment?: string;
  excerpt?: string | null;
  reason?: string | null;
};

export type EssayStudyPointDto = {
  kind?: string;
  criterionCode?: string | null;
  band?: number | null;
  knowledgePointId?: string | null;
  code?: string | null;
  name?: string | null;
  title?: string | null;
  reason?: string | null;
  excerpt?: string | null;
  practiceKnowledgePointId?: string | null;
};
