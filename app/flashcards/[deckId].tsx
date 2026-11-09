import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';

import { ActivityIndicator, View } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { StudySession } from '@/src/features/flashcards/components/study-session';

import { vocabApi } from '@/src/features/vocab/api';

import {
  useDueStudy,
  toStudyCards,
} from '@/src/features/flashcards/use-due-study';
import { FlashcardSignIn } from '@/src/features/flashcards/components/query-state';
import { colors } from '@/src/theme';

export default function DeckStudyScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const { due: dueQuery, review, loadMore, enabled } = useDueStudy(deckId);
  const deckQuery = useQuery({
    queryKey: ['flashcards', 'deck', deckId],
    queryFn: () => vocabApi.getDeck(deckId),
    enabled: enabled && Boolean(deckId),
  });
  const cards = toStudyCards(dueQuery.data?.items ?? []);
  const hasMoreCards =
    (dueQuery.data?.total ?? 0) > (dueQuery.data?.items.length ?? 0);

  if (!enabled)
    return (
      <View className="flex-1 bg-canvas">
        <FlashcardSignIn />
      </View>
    );
  if (!deckId)
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Học thẻ" fallbackHref="/(tabs)/flashcards" />
        <View className="px-5 pt-5">
          <FormAlert tone="error" message="Không tìm thấy bộ thẻ." />
        </View>
      </View>
    );
  if (deckQuery.isPending || dueQuery.isPending)
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Học thẻ" fallbackHref="/(tabs)/flashcards" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
          <Text className="mt-3 text-sm text-muted">
            Đang đồng bộ thẻ đến hạn…
          </Text>
        </View>
      </View>
    );
  if (deckQuery.isError || dueQuery.isError)
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Học thẻ" fallbackHref="/(tabs)/flashcards" />
        <View className="px-5 pt-5">
          <FormAlert
            tone="error"
            message={
              deckQuery.error?.message ??
              dueQuery.error?.message ??
              'Không tải được dữ liệu bộ thẻ.'
            }
          />
          <View className="mt-4">
            <Button
              variant="secondary"
              label="Thử lại"
              onPress={() => {
                void deckQuery.refetch();
                void dueQuery.refetch();
              }}
            />
          </View>
        </View>
      </View>
    );

  const deck = deckQuery.data;
  const exit = () => router.back();

  return (
    <View className="flex-1 bg-canvas">
      <BackHeader
        title={deck.name}
        subtitle={`${deck.dueCount} thẻ đến hạn · ${deck.cardCount} thẻ tất cả`}
        fallbackHref="/(tabs)/flashcards"
      />
      <StudySession
        key={deckId}
        cards={cards}
        onReview={review}
        hasMoreCards={hasMoreCards}
        onLoadMore={loadMore}
        onExit={exit}
      />
    </View>
  );
}
