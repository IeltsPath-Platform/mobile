import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { QueryState, FlashcardSignIn } from '@/src/features/flashcards/components/query-state';
import { invalidateFlashcards, nextPage, useFlashcardAccess } from '@/src/features/flashcards/queries';
import { vocabApi, listAllDeckItems } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

type CardRow = { id: string; front: string; back: string };

export default function AddCardsScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const enabled = useFlashcardAccess();
  const client = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const cards = useInfiniteQuery({
    queryKey: ['flashcards', 'card-pages'],
    queryFn: ({ pageParam, signal }) => vocabApi.listCards(pageParam, 30, 'ACTIVE', signal),
    initialPageParam: 0,
    getNextPageParam: nextPage,
    enabled,
  });
  const items = useQuery({
    queryKey: ['flashcards', 'deck-items', deckId],
    queryFn: ({ signal }) => listAllDeckItems(deckId, signal),
    enabled: enabled && Boolean(deckId),
  });
  const existing = useMemo(() => new Set(items.data?.map((item) => item.flashcardId) ?? []), [items.data]);
  const available = useMemo(
    () => cards.data?.pages.flatMap((page) => page.items).filter((card) => !existing.has(card.id)) ?? [],
    [cards.data, existing],
  );

  // Filtering is client-side, so keep paging while a page leaves nothing to show.
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = cards;
  useEffect(() => {
    if (
      items.isSuccess &&
      available.length === 0 &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isFetchNextPageError
    )
      void fetchNextPage();
  }, [items.isSuccess, available.length, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const add = useMutation({
    mutationFn: async () => {
      const failed: string[] = [];
      let message = '';
      for (const id of selected.filter((id) => !existing.has(id))) {
        try {
          await vocabApi.addDeckItem(deckId, id);
        } catch (reason) {
          failed.push(id);
          message = reason instanceof Error ? reason.message : 'Vui lòng thử lại.';
        }
      }
      return { failed, message };
    },
    onSuccess: async ({ failed, message }) => {
      setSelected(failed);
      await invalidateFlashcards(client);
      if (failed.length) setError(`Còn ${failed.length} thẻ chưa thêm được. Những thẻ khác đã lưu. ${message}`);
      else router.back();
    },
  });

  const toggle = useCallback(
    (id: string) =>
      setSelected((previous) => (previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id])),
    [],
  );
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  return (
    <View className="flex-1 bg-canvas">
      <BackHeader title="Thêm thẻ vào bộ" fallbackHref="/(tabs)/flashcards" />
      {!enabled ? (
        <FlashcardSignIn />
      ) : (
        <>
          <FlatList
            data={items.isSuccess ? available : []}
            keyExtractor={(card) => card.id}
            contentContainerClassName="px-5 pb-6 pt-4"
            ListHeaderComponent={
              <View className="gap-3">
                <Text className="text-sm text-muted">Chọn các thẻ trong thư viện của bạn.</Text>
                <QueryState
                  pending={cards.isPending || items.isPending}
                  error={cards.error ?? items.error}
                  retry={() => {
                    void cards.refetch();
                    void items.refetch();
                  }}
                />
                {error ? (
                  <Text accessibilityRole="alert" className="text-sm text-danger">
                    {error}
                  </Text>
                ) : null}
              </View>
            }
            renderItem={({ item }) => (
              <SelectableCard card={item} checked={selectedSet.has(item.id)} disabled={add.isPending} onToggle={toggle} />
            )}
            ListEmptyComponent={
              cards.isSuccess && items.isSuccess && !cards.hasNextPage ? (
                <Text className="py-6 text-center text-muted">Không có thẻ phù hợp trong trang đã tải.</Text>
              ) : undefined
            }
            ListFooterComponent={
              cards.hasNextPage ? (
                <Button
                  className="mt-4"
                  label="Tải thêm thẻ"
                  variant="secondary"
                  loading={cards.isFetchingNextPage}
                  disabled={add.isPending}
                  onPress={() => void cards.fetchNextPage()}
                />
              ) : undefined
            }
          />
          <View className="border-t border-line bg-canvas p-5">
            <Button
              label={`Thêm ${selected.length} thẻ`}
              loading={add.isPending}
              disabled={!selected.length || !items.isSuccess || !deckId}
              onPress={() => {
                setError('');
                add.mutate();
              }}
            />
          </View>
        </>
      )}
    </View>
  );
}

const SelectableCard = memo(function SelectableCard({
  card,
  checked,
  disabled,
  onToggle,
}: {
  card: CardRow;
  checked: boolean;
  disabled: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => onToggle(card.id)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={card.front}
      className="mt-3 min-h-11 flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-4"
    >
      <View className="flex-1">
        <Text weight="bold">{card.front}</Text>
        <Text className="mt-1 text-sm text-muted" numberOfLines={2}>
          {card.back}
        </Text>
      </View>
      <View
        className="h-7 w-7 items-center justify-center rounded-full"
        style={{ backgroundColor: checked ? colors.accent : colors.canvas }}
      >
        {checked ? <Check size={17} color="white" /> : null}
      </View>
    </Pressable>
  );
});
