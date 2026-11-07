import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { vocabApi, type Flashcard } from '@/src/features/vocab/api';
import { createRequestId } from '@/src/lib/request-id';
import { invalidateFlashcards, useFlashcardAccess } from './queries';
import type { StudyCard } from './types';
import { studyKeys } from '@/src/features/vocab/study-api';

export function toStudyCards(items: Flashcard[]): StudyCard[] {
  return items
    .filter((card) => card.status === 'ACTIVE')
    .map((card) => ({
      id: card.id,
      front: card.front,
      back: [card.ipa, card.back, card.exampleSentence]
        .filter(Boolean)
        .join('\n\n'),
      pronunciationAudioReference: card.pronunciationAudioReference,
      imageUrl: card.imageUrl,
    }));
}

export function useDueStudy(deckId?: string) {
  const enabled = useFlashcardAccess();
  const client = useQueryClient();
  const [sessionId] = useState(createRequestId);
  const key = ['flashcards', 'due', deckId ?? 'all'];
  const due = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => vocabApi.dueCards(deckId, 0, 50, signal),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Also refresh when leaving through the header or iOS back gesture.
  useEffect(
    () => () => {
      void invalidateFlashcards(client);
    },
    [client],
  );

  const review = async (
    cardId: string,
    correct: boolean,
    requestId: string,
  ) => {
    await vocabApi.reviewCard(cardId, correct, requestId, sessionId);
    // Refresh account stats without delaying the next card on a summary request.
    void client.invalidateQueries({ queryKey: studyKeys.summary });
    await Promise.all([
      client.invalidateQueries({
        queryKey: ['flashcards'],
        refetchType: 'none',
      }),
      client.invalidateQueries({
        queryKey: ['vocab', 'achievements'],
        refetchType: 'none',
      }),
    ]);
  };
  const loadMore = async () => {
    // Reviewed cards leave the due queue: requesting page 1 would skip cards.
    const response = await vocabApi.dueCards(deckId, 0, 50);
    client.setQueryData(key, response);
    return toStudyCards(response.items);
  };
  return { due, review, loadMore, enabled };
}
