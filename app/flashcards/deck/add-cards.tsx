import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { QueryState, FlashcardSignIn } from '@/src/features/flashcards/components/query-state';
import { invalidateFlashcards, nextPage, useFlashcardAccess } from '@/src/features/flashcards/queries';
import { vocabApi, listAllDeckItems } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

export default function AddCardsScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const enabled = useFlashcardAccess();
  const client = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const cards = useInfiniteQuery({ queryKey: ['flashcards', 'card-pages'], queryFn: ({ pageParam }) => vocabApi.listCards(pageParam, 30), initialPageParam: 0, getNextPageParam: nextPage, enabled });
  const items = useQuery({ queryKey: ['flashcards', 'deck-items', deckId], queryFn: ({ signal }) => listAllDeckItems(deckId, signal), enabled: enabled && Boolean(deckId) });
  const existing = new Set(items.data?.map((item) => item.flashcardId) ?? []);
  const add = useMutation({
    mutationFn: async () => {
      const failed: string[] = [];
      let message = '';
      for (const id of selected.filter((id) => !existing.has(id))) {
        try { await vocabApi.addDeckItem(deckId, id); }
        catch (reason) { failed.push(id); message = reason instanceof Error ? reason.message : 'Vui lòng thử lại.'; }
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
  const available = cards.data?.pages.flatMap((page) => page.items).filter((card) => !existing.has(card.id)) ?? [];
  return <View className="flex-1 bg-canvas"><BackHeader title="Thêm thẻ vào bộ" fallbackHref="/(tabs)/flashcards" />
    {!enabled ? <FlashcardSignIn /> : <><FlatList data={items.isSuccess ? available : []} keyExtractor={(card) => card.id} contentContainerClassName="px-5 pb-6 pt-4"
      ListHeaderComponent={<View className="gap-3"><Text className="text-sm text-muted">Chọn các thẻ trong thư viện của bạn.</Text><QueryState pending={cards.isPending || items.isPending} error={cards.error ?? items.error} retry={() => { void cards.refetch(); void items.refetch(); }} />{error ? <Text accessibilityRole="alert" className="text-sm text-danger">{error}</Text> : null}</View>}
      renderItem={({ item }) => {
        const checked = selected.includes(item.id);
        return <Pressable disabled={add.isPending} onPress={() => setSelected((previous) => checked ? previous.filter((id) => id !== item.id) : [...previous, item.id])} accessibilityRole="checkbox" accessibilityState={{ checked, disabled: add.isPending }} accessibilityLabel={item.front} className="mt-3 flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-4"><View className="flex-1"><Text weight="bold">{item.front}</Text><Text className="mt-1 text-sm text-muted" numberOfLines={2}>{item.back}</Text></View><View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: checked ? colors.accent : colors.canvas }}>{checked ? <Check size={17} color="white" /> : null}</View></Pressable>;
      }}
      ListEmptyComponent={cards.isSuccess && items.isSuccess ? <Text className="py-6 text-center text-muted">Không có thẻ phù hợp trong trang đã tải.</Text> : undefined}
      ListFooterComponent={cards.hasNextPage ? <Button className="mt-4" label="Tải thêm thẻ" variant="secondary" loading={cards.isFetchingNextPage} disabled={add.isPending} onPress={() => void cards.fetchNextPage()} /> : undefined}
    /><View className="border-t border-line bg-canvas p-5"><Button label={`Thêm ${selected.length} thẻ`} loading={add.isPending} disabled={!selected.length || !items.isSuccess || !deckId} onPress={() => { setError(''); add.mutate(); }} /></View></>}
  </View>;
}
