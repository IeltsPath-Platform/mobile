// Ported from frontend/src/features/learning-path/api/learningAdapters.ts (mapKnowledgeJudgments, mapStudyPoints).
import type { EssayKnowledgeJudgment, EssayKnowledgeJudgmentDto, EssayStudyPoint, EssayStudyPointDto } from './types';

/** A judgment of a knowledge point; one without a point id cannot be shown against anything and is dropped. */
export function mapKnowledgeJudgments(items: EssayKnowledgeJudgmentDto[] | null | undefined): EssayKnowledgeJudgment[] {
  return (items ?? [])
    .filter((item) => Boolean(item.knowledgePointId))
    .map((item) => ({
      knowledgePointId: item.knowledgePointId!,
      code: item.code ?? null,
      name: item.name ?? null,
      judgment: item.judgment === 'PASS' || item.judgment === 'FAIL' ? item.judgment : 'NOT_ASSESSED',
      excerpt: item.excerpt ?? null,
      reason: item.reason ?? null,
    }));
}

/** What the learner should study after an essay: weak criteria, failed knowledge points and the grader's focus notes. */
export function mapStudyPoints(items: EssayStudyPointDto[] | null | undefined): EssayStudyPoint[] {
  return (items ?? []).map((point): EssayStudyPoint => ({
    kind: point.kind === 'CRITERION' || point.kind === 'KNOWLEDGE_POINT' ? point.kind : 'AI',
    criterionCode: point.criterionCode ?? null,
    band: point.band ?? null,
    knowledgePointId: point.knowledgePointId ?? null,
    code: point.code ?? null,
    name: point.name ?? null,
    title: point.title ?? null,
    reason: point.reason ?? null,
    excerpt: point.excerpt ?? null,
    practiceKnowledgePointId: point.practiceKnowledgePointId ?? null,
  })).filter((point) => (point.kind === 'CRITERION' || point.kind === 'KNOWLEDGE_POINT' ? Boolean(point.knowledgePointId) : Boolean(point.title?.trim())));
}
