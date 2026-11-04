import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { StudySession } from '@/src/features/flashcards/components/study-session';
import type { StudyCard } from '@/src/features/flashcards/types';
import { vocabApi, type Flashcard, type FlashcardDeck, type PageResponse } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

function cardsFromDue(items: Flashcard[]): StudyCard[] {
  return items.filter((card) => card.status === 'ACTIVE').map((card) => ({
    id: card.id,
    front: card.front,
    back: [card.ipa, card.back, card.exampleSentence].filter(Boolean).join('\n\n'),
    imageUrl: card.imageUrl,
  }));
}

export default function DeckStudyScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const queryClient = useQueryClient();
  const deckQuery = useQuery({ queryKey: ['flashcards', 'deck', deckId], queryFn: () => vocabApi.getDeck(deckId), enabled: Boolean(deckId) });
  const dueQuery = useQuery({ queryKey: ['flashcards', 'due', deckId], queryFn: () => vocabApi.dueCards(deckId, 0, 50), enabled: Boolean(deckId), staleTime: 10_000 });
  const cards = cardsFromDue(dueQuery.data?.items ?? []);
  const hasMoreCards = (dueQuery.data?.total ?? 0) > (dueQuery.data?.items.length ?? 0);

  if (deckQuery.isPending || dueQuery.isPending) return <View className="flex-1 bg-canvas"><BackHeader title="Học thẻ" fallbackHref="/(tabs)/flashcards" /><View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.accent} /><Text className="mt-3 text-sm text-muted">Đang đồng bộ thẻ đến hạn…</Text></View></View>;
  if (deckQuery.isError || dueQuery.isError) return <View className="flex-1 bg-canvas"><BackHeader title="Học thẻ" fallbackHref="/(tabs)/flashcards" /><View className="px-5 pt-5"><FormAlert tone="error" message={deckQuery.error?.message ?? dueQuery.error?.message ?? 'Không tải được dữ liệu bộ thẻ.'} /><View className="mt-4"><Button variant="secondary" label="Thử lại" onPress={() => { void deckQuery.refetch(); void dueQuery.refetch(); }} /></View></View></View>;

  const deck = deckQuery.data;
  const review = async (cardId: string, correct: boolean, requestId: string) => {
    const reviewed = await vocabApi.reviewCard(cardId, correct, requestId);
    queryClient.setQueryData<PageResponse<Flashcard>>(['flashcards', 'due', deckId], (previous) => previous ? {
      ...previous,
      items: correct ? previous.items.filter((card) => card.id !== cardId) : previous.items.map((card) => card.id === cardId ? reviewed : card),
      total: Math.max(0, previous.total - (correct ? 1 : 0)),
    } : previous);
    if (correct) {
      queryClient.setQueryData<FlashcardDeck>(['flashcards', 'deck', deckId], (previous) => previous ? { ...previous, dueCount: Math.max(0, previous.dueCount - 1) } : previous);
      queryClient.setQueryData<FlashcardDeck[]>(['flashcards', 'decks'], (previous) => previous?.map((item) => item.id === deckId ? { ...item, dueCount: Math.max(0, item.dueCount - 1) } : item));
    }
  };
  const exit = () => {
    void queryClient.invalidateQueries({ queryKey: ['flashcards', 'due', deckId] });
    void queryClient.invalidateQueries({ queryKey: ['flashcards', 'decks'] });
    router.back();
  };
  const loadMore = async () => {
    const response = await vocabApi.dueCards(deckId, 0, 50);
    queryClient.setQueryData(['flashcards', 'due', deckId], response);
    return cardsFromDue(response.items);
  };

  return <View className="flex-1 bg-canvas">
    <BackHeader title={deck.name} subtitle={`${deck.dueCount} thẻ đến hạn · ${deck.cardCount} thẻ tất cả`} fallbackHref="/(tabs)/flashcards" />
    <StudySession key={deckId} cards={cards} onReview={review} hasMoreCards={hasMoreCards} onLoadMore={loadMore} onExit={exit} />
  </View>;
}
