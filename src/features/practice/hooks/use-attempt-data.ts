import { useQuery } from '@tanstack/react-query';

import { getAttemptResponses, getAttemptStructure, getReadingAttempt } from '../api/attempts';
import { parseSections } from '../model/sections';

/** The attempt, its parsed sections and the answers the server already holds, loaded together. */
export function useAttemptData(attemptId: string) {
  return useQuery({
    queryKey: ['practice', 'attempt-data', attemptId],
    enabled: Boolean(attemptId),
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    queryFn: async ({ signal }) => {
      const [attempt, structure, responses] = await Promise.all([
        getReadingAttempt(attemptId, signal), getAttemptStructure(attemptId, signal), getAttemptResponses(attemptId, signal),
      ]);
      return { attempt, sections: parseSections(structure), saved: responses };
    },
  });
}
