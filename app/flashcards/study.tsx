import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { StudySession } from '@/src/features/flashcards/components/study-session';
import type { StudyCard } from '@/src/features/flashcards/types';
import { vocabApi, type Flashcard } from '@/src/features/vocab/api';
import { createRequestId } from '@/src/lib/request-id';
import { invalidateFlashcards } from '@/src/features/flashcards/queries';
import { colors } from '@/src/theme';
const toStudyCards = (items: Flashcard[]): StudyCard[] => items.filter((card) => card.status === 'ACTIVE').map((card) => ({ id: card.id, front: card.front, back: [card.ipa, card.back, card.exampleSentence].filter(Boolean).join('\n\n'), pronunciationAudioReference: card.pronunciationAudioReference, imageUrl: card.imageUrl }));
export default function AllCardsStudyScreen() {
  const [sessionId] = useState(createRequestId);
  const client = useQueryClient(); const key = ['flashcards', 'due', 'all'];
  const due = useQuery({ queryKey: key, queryFn: () => vocabApi.dueCards(undefined, 0, 50), staleTime: 0 });
  if (due.isPending) return <View className="flex-1 bg-canvas"><BackHeader title="Ôn tất cả thẻ" fallbackHref="/(tabs)/flashcards" /><View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.accent}/><Text className="mt-3 text-sm text-muted">Đang tải thẻ đến hạn…</Text></View></View>;
  if (due.isError) return <View className="flex-1 bg-canvas"><BackHeader title="Ôn tất cả thẻ" fallbackHref="/(tabs)/flashcards" /><View className="p-5"><FormAlert tone="error" message={due.error.message}/><Button className="mt-4" label="Thử lại" onPress={() => void due.refetch()}/></View></View>;
  const review = async (id: string, correct: boolean, requestId: string) => {
    await vocabApi.reviewCard(id, correct, requestId, sessionId);
    await client.invalidateQueries({ queryKey: ['flashcards'], refetchType: 'none' });
    await client.invalidateQueries({ queryKey: ['vocab', 'achievements'], refetchType: 'none' });
  };
  const loadMore = async () => { const result = await vocabApi.dueCards(undefined, 0, 50); client.setQueryData(key, result); return toStudyCards(result.items); };
  const exit = () => { void invalidateFlashcards(client); router.back(); };
  return <View className="flex-1 bg-canvas"><BackHeader title="Ôn tất cả thẻ" subtitle={`${due.data.total} thẻ đang đến hạn`} fallbackHref="/(tabs)/flashcards" /><StudySession key="all-due" cards={toStudyCards(due.data.items)} onReview={review} hasMoreCards={due.data.total > due.data.items.length} onLoadMore={loadMore} onExit={exit}/></View>;
}
