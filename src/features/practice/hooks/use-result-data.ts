import { useQuery } from '@tanstack/react-query';

import { getAttemptResponses, getAttemptStructure, getReadingAttempt, getReadingResult } from '../api/attempts';
import { buildReadingResultView } from '../model/result-view';
import { parseSections } from '../model/sections';

/** A submitted Reading/Listening attempt with its result, structure and answers, and the view the result screens draw. */
export function useResultData(attemptId: string) {
  return useQuery({
    queryKey: ['practice', 'result', attemptId],
    enabled: Boolean(attemptId),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const attempt = await getReadingAttempt(attemptId, signal);
      if (attempt.status !== 'SUBMITTED') return { attempt, ready: false as const };
      const [result, structure, responses] = await Promise.all([
        getReadingResult(attemptId, signal), getAttemptStructure(attemptId, signal), getAttemptResponses(attemptId, signal),
      ]);
      const view = buildReadingResultView({
        structure,
        responses: responses.map((response) => ({ attemptItemId: response.attemptItemId, payload: response.payload })),
        result,
        attempt: { startedAt: attempt.startedAt ?? null, submittedAt: attempt.submittedAt ?? null },
      });
      const transcripts = new Map((result.sectionSolutions ?? []).flatMap((entry) => (entry.transcript ? [[entry.attemptSectionId, entry.transcript] as const] : [])));
      return { attempt, ready: true as const, result, structure, view, sections: parseSections(structure), transcripts };
    },
  });
}
