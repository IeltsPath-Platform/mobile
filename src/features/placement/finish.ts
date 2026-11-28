import { getAttemptStructure, startAttemptSection } from '@/src/features/practice/api/attempts';
import type { TestSection } from '@/src/features/practice/model/sections';

import { placementApi } from './api';

/**
 * Hands in every open section of one skill, then reads the attempt again: once no section is left open the whole test is
 * submitted. Completing locks a section's answers on the server, as on the web. Resolves whether the test was submitted.
 */
export async function finishSkill(attemptId: string, sections: TestSection[]): Promise<boolean> {
  for (const section of sections) {
    if (section.completedAt) continue;
    // A part the learner never opened still needs its clock started before it can be completed.
    if (!section.startedAt) await startAttemptSection(attemptId, section.id).catch(() => undefined);
    await placementApi.completeSection(attemptId, section.id);
  }
  const structure = await getAttemptStructure(attemptId);
  if (structure.sections.some((section) => !section.completedAt)) return false;
  await placementApi.submit(attemptId);
  return true;
}
