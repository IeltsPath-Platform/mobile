import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Image, Pressable, TextInput, View } from 'react-native';
import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { levels, notebookApi, type NotebookFilters, type UnderstandingLevel } from '@/src/features/flashcards/notebook-api';
import { invalidateFlashcards, nextPage, useDebouncedSearch, useFlashcardAccess } from '@/src/features/flashcards/queries';
import { FlashcardSignIn, QueryState } from '@/src/features/flashcards/components/query-state';
import { createRequestId } from '@/src/lib/request-id';
import { colors } from '@/src/theme';

const sorts = { RECENT: 'Mới lưu', DUE: 'Đến hạn', ALPHABET: 'A–Z', WEAKEST: 'Cần luyện' } as const;

export default function NotebookScreen() {
  const { topicId, setId, title } = useLocalSearchParams<{ topicId?: string; setId?: string; title?: string }>();
  const enabled = useFlashcardAccess();
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const q = useDebouncedSearch(search);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [level, setLevel] = useState<UnderstandingLevel | undefined>();
  const [sort, setSort] = useState<NotebookFilters['sort']>('RECENT');
  const [due, setDue] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const requestIds = useRef(new Map<string, string>());
  const filters = { q, level, sort, due: due || undefined, topicId, setId };
  const entries = useInfiniteQuery({
    queryKey: ['flashcards', 'notebook', 'entries', filters],
    queryFn: ({ pageParam, signal }) => notebookApi.entries(filters, pageParam, signal),
    initialPageParam: 0, getNextPageParam: nextPage, enabled, staleTime: 30_000,
  });
  const update = useMutation({
    mutationFn: ({ id, value, requestId }: { id: string; value: UnderstandingLevel; requestId: string }) => notebookApi.setLevel(id, value, requestId),
    onSuccess: async (_, variables) => {
      requestIds.current.delete(`${variables.id}:${variables.value}`);
      setEditing(null);
      await invalidateFlashcards(client);
    },
  });
  const setUnderstanding = (id: string, value: UnderstandingLevel) => {
    const key = `${id}:${value}`;
    const requestId = requestIds.current.get(key) ?? createRequestId();
    requestIds.current.set(key, requestId);
    update.mutate({ id, value, requestId });
  };

  return <View className="flex-1 bg-canvas">
    <BackHeader title={title || 'Sổ từ của tôi'} fallbackHref="/(tabs)/flashcards" />
    {!enabled ? <FlashcardSignIn /> : <FlatList
      data={entries.data?.pages.flatMap((page) => page.items) ?? []}
      keyExtractor={(entry) => entry.flashcardId}
      contentContainerClassName="px-5 pb-10"
      keyboardShouldPersistTaps="handled"
      refreshing={entries.isRefetching && !entries.isFetchingNextPage}
      onRefresh={() => void entries.refetch()}
      ListHeaderComponent={<View className="gap-3 pb-4">
        <TextInput value={search} onChangeText={setSearch} maxLength={100} placeholder="Tìm trong từ đã lưu" placeholderTextColor={colors.muted} accessibilityLabel="Tìm trong sổ từ" className="min-h-12 rounded-2xl border border-line bg-surface px-4 text-ink" />
        <View className="flex-row gap-3"><Button className="flex-1" label="Thêm từ" onPress={() => router.push('/flashcards/notebook-add')} /><Button className="flex-1" variant="secondary" label={filtersOpen ? 'Đóng bộ lọc' : 'Lọc & sắp xếp'} onPress={() => setFiltersOpen(!filtersOpen)} /></View>
        {filtersOpen ? <View className="gap-3 rounded-2xl bg-surface p-4">
          <Text weight="bold">Mức độ ghi nhớ</Text>
          <View className="flex-row flex-wrap gap-2">{([undefined, ...Object.keys(levels)] as (UnderstandingLevel | undefined)[]).map((value) => <Pressable key={value ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: level === value }} onPress={() => setLevel(value)} className="min-h-11 justify-center rounded-xl px-3" style={{ backgroundColor: level === value ? colors.accentSoft : colors.canvas }}><Text className="text-sm">{value ? levels[value] : 'Tất cả'}</Text></Pressable>)}</View>
          <View className="flex-row flex-wrap gap-2">{(Object.keys(sorts) as (keyof typeof sorts)[]).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: sort === value }} onPress={() => setSort(value)} className="min-h-11 justify-center rounded-xl px-3" style={{ backgroundColor: sort === value ? colors.accentSoft : colors.canvas }}><Text className="text-sm">{sorts[value]}</Text></Pressable>)}</View>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: due }} onPress={() => setDue(!due)} className="min-h-11 justify-center"><Text>{due ? '✓ ' : ''}Chỉ từ đến hạn ôn</Text></Pressable>
        </View> : null}
        <Text className="text-sm text-muted">{entries.data ? `${entries.data.pages[0].total} từ đã lưu` : 'Sổ từ theo tài khoản của bạn'}</Text>
        <QueryState pending={entries.isPending} error={entries.error} retry={() => void entries.refetch()} />
        {update.error ? <Text accessibilityRole="alert" className="text-sm text-danger">{update.error.message}</Text> : null}
      </View>}
      renderItem={({ item }) => <View className="mb-3 rounded-2xl border border-line bg-surface p-4">
        <View className="flex-row items-center gap-3">
          {item.imageUrl ? <Image source={{ uri: item.imageUrl }} className="h-14 w-14 rounded-xl" accessibilityLabel={item.lemma} /> : null}
          <View className="flex-1"><Text weight="bold" className="text-lg">{item.lemma}</Text><Text className="text-sm text-muted">{[item.ipa, item.partOfSpeech].filter(Boolean).join(' · ')}</Text></View>
        </View>
        <Text className="mt-2">{item.vietnameseMeaning || item.englishDefinition}</Text>
        {item.exampleSentence ? <Text className="mt-2 text-sm italic text-muted">{item.exampleSentence}</Text> : null}
        <View className="mt-2 flex-row items-center justify-between">
          <Pressable accessibilityRole="button" accessibilityLabel={`Đổi mức độ ghi nhớ ${item.lemma}`} onPress={() => { setEditing(editing === item.flashcardId ? null : item.flashcardId); update.reset(); }} className="min-h-11 justify-center"><Text weight="bold" className="text-sm text-accent-deep">{levels[item.level]} ▾</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/flashcards/card/edit', params: { cardId: item.flashcardId } })} className="min-h-11 justify-center px-2"><Text className="text-sm text-muted">Sửa thẻ</Text></Pressable>
        </View>
        {editing === item.flashcardId ? <View className="flex-row flex-wrap gap-2">{(Object.keys(levels) as UnderstandingLevel[]).map((value) => <Button key={value} variant="secondary" label={levels[value]} disabled={update.isPending || value === item.level} onPress={() => setUnderstanding(item.flashcardId, value)} />)}</View> : null}
      </View>}
      ListEmptyComponent={entries.isSuccess ? <Text className="py-8 text-center text-muted">Chưa có từ phù hợp. Thêm từ hoặc đổi bộ lọc.</Text> : undefined}
      ListFooterComponent={entries.hasNextPage ? <Button label="Tải thêm từ" variant="secondary" loading={entries.isFetchingNextPage} onPress={() => void entries.fetchNextPage()} /> : undefined}
    />}
  </View>;
}
