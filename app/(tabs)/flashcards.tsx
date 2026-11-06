import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { BookMarked, BookOpen, ChartNoAxesColumn, ChevronRight, Layers3, Plus, RotateCcw } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Image, Pressable, View } from 'react-native';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { FlashcardSignIn, QueryState } from '@/src/features/flashcards/components/query-state';
import { notebookApi } from '@/src/features/flashcards/notebook-api';
import { nextPage, useFlashcardAccess } from '@/src/features/flashcards/queries';
import { vocabApi } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

type Tab = 'decks' | 'cards';
type LibraryRow = { id: string; title: string; subtitle: string; imageUrl: string | null; detail: string };

export default function FlashcardsScreen() {
  const listRef = useRef<FlatList<LibraryRow>>(null);
  useFocusEffect(useCallback(() => () => listRef.current?.scrollToOffset({ offset: 0, animated: false }), []));
  const enabled = useFlashcardAccess();
  const [tab, setTab] = useState<Tab>('decks');

  const decks = useInfiniteQuery({
    queryKey: ['flashcards', 'deck-pages'],
    queryFn: ({ pageParam }) => vocabApi.listDecks(pageParam, 30),
    initialPageParam: 0,
    getNextPageParam: nextPage,
    enabled: enabled && tab === 'decks',
    staleTime: 30_000,
  });
  const cards = useInfiniteQuery({
    queryKey: ['flashcards', 'card-pages'],
    queryFn: ({ pageParam }) => vocabApi.listCards(pageParam, 30),
    initialPageParam: 0,
    getNextPageParam: nextPage,
    enabled: enabled && tab === 'cards',
    staleTime: 30_000,
  });
  const due = useQuery({
    queryKey: ['flashcards', 'due', 'count'],
    queryFn: () => vocabApi.dueCards(undefined, 0, 1),
    enabled,
    staleTime: 30_000,
  });
  const notebookSummary = useQuery({
    queryKey: ['flashcards', 'notebook', 'summary-brief'],
    queryFn: () => notebookApi.summary(Intl.DateTimeFormat().resolvedOptions().timeZone),
    enabled,
    staleTime: 60_000,
  });

  const active = tab === 'decks' ? decks : cards;
  const rows: LibraryRow[] =
    tab === 'decks'
      ? (decks.data?.pages.flatMap((page) => page.items) ?? []).map((deck) => ({
          id: deck.id,
          title: deck.name,
          subtitle: deck.description || `${deck.cardCount} thẻ`,
          imageUrl: deck.coverImageUrl ?? null,
          detail: `${deck.dueCount} thẻ cần ôn`,
        }))
      : (cards.data?.pages.flatMap((page) => page.items) ?? []).map((card) => ({
          id: card.id,
          title: card.front,
          subtitle: card.back,
          imageUrl: card.imageUrl ?? null,
          detail: `${card.reviewCount} lượt ôn`,
        }));
  const open = (route: '/flashcards/deck/edit' | '/flashcards/card/edit' | '/flashcards/notebook' | '/flashcards/progress') =>
    router.push(enabled ? route : '/(auth)/login');

  const hasNotebook = enabled && notebookSummary.data && notebookSummary.data.total > 0;
  const notebookDue = notebookSummary.data?.dueNow ?? 0;

  return (
    <View className="flex-1 bg-canvas">
      <FlatList
        ref={listRef}
        data={enabled ? rows : []}
        keyExtractor={(row) => row.id}
        contentContainerClassName="px-5 pb-10 pt-3"
        showsVerticalScrollIndicator={false}
        refreshing={enabled && active.isRefetching && !active.isFetchingNextPage}
        onRefresh={
          enabled
            ? () => {
                void active.refetch();
                void due.refetch();
                void notebookSummary.refetch();
              }
            : undefined
        }
        ListHeaderComponent={
          <View className="gap-3 pb-4">
            <Text accessibilityRole="header" className="text-[24px]" weight="black">
              Thẻ từ
            </Text>

            {/* Notebook card — entry point chính */}
            {hasNotebook ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => open('/flashcards/notebook')}
                className="overflow-hidden rounded-3xl border border-line bg-surface"
              >
                <View className="flex-row items-center gap-3 p-4">
                  <View
                    className="h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: colors.accentSoft }}
                  >
                    <BookMarked size={22} color={colors.accentDeep} />
                  </View>
                  <View className="flex-1">
                    <Text weight="bold" className="text-base">
                      Sổ từ của bạn
                    </Text>
                    <Text className="mt-0.5 text-sm text-muted">
                      {notebookSummary.data!.total} từ đã lưu
                      {notebookDue > 0 ? ` · ${notebookDue} từ cần ôn` : ' · Đã ôn hết'}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.muted} />
                </View>
                {notebookDue > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ôn ${notebookDue} từ ngay`}
                    onPress={() => router.push('/flashcards/study')}
                    className="mx-4 mb-4 h-11 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: colors.accent }}
                  >
                    <Text weight="extrabold" className="text-sm" style={{ color: '#ffffff' }}>
                      Ôn {notebookDue} từ ngay →
                    </Text>
                  </Pressable>
                ) : null}
              </Pressable>
            ) : null}

            {/* Banner thẻ deck đến hạn */}
            {enabled ? (
              <View className="rounded-3xl p-4" style={{ backgroundColor: colors.warmSoft }}>
                <View className="flex-row items-center gap-3">
                  <RotateCcw size={22} color={colors.accentWarm} />
                  <Text className="flex-1 text-base" weight="bold">
                    {due.data ? `${due.data.total} thẻ trong bộ cần ôn` : 'Thẻ bộ đến hạn'}
                  </Text>
                  {due.data && due.data.total > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push('/flashcards/study')}
                      className="min-h-10 justify-center"
                    >
                      <Text weight="bold" className="text-accent-deep">
                        Ôn ngay →
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                <QueryState pending={due.isPending} error={due.error} retry={() => void due.refetch()} />
              </View>
            ) : (
              <FlashcardSignIn />
            )}

            {/* Nút nhanh */}
            <View className="flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                onPress={() => open('/flashcards/notebook')}
                className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-line bg-surface"
              >
                <BookOpen size={18} color={colors.accentDeep} />
                <Text weight="bold" className="text-sm">
                  Sổ từ
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => open('/flashcards/progress')}
                className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-line bg-surface"
              >
                <ChartNoAxesColumn size={18} color={colors.accentDeep} />
                <Text weight="bold" className="text-sm">
                  Tiến độ
                </Text>
              </Pressable>
            </View>

            {/* Tab Bộ thẻ / Thẻ của tôi */}
            <View className="flex-row items-center border-b border-line">
              {([
                { id: 'decks', label: 'Bộ thẻ' },
                { id: 'cards', label: 'Thẻ của tôi' },
              ] as const).map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === item.id }}
                  onPress={() => {
                    setTab(item.id);
                    listRef.current?.scrollToOffset({ offset: 0, animated: false });
                  }}
                  className="min-h-12 flex-1 items-center justify-center"
                >
                  <Text weight="bold" className={tab === item.id ? 'text-accent-deep' : 'text-muted'}>
                    {item.label}
                  </Text>
                  {tab === item.id ? <View className="absolute bottom-0 h-[3px] w-10 rounded-full bg-accent" /> : null}
                </Pressable>
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tab === 'decks' ? 'Tạo bộ thẻ' : 'Tạo thẻ'}
                onPress={() => open(tab === 'decks' ? '/flashcards/deck/edit' : '/flashcards/card/edit')}
                className="h-12 w-12 items-center justify-center"
              >
                <Plus size={23} color={colors.accentDeep} />
              </Pressable>
            </View>
            {enabled ? <QueryState pending={active.isPending} error={active.error} retry={() => void active.refetch()} /> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              tab === 'decks'
                ? router.push({ pathname: '/flashcards/deck/[deckId]', params: { deckId: item.id } })
                : router.push({ pathname: '/flashcards/card/edit', params: { cardId: item.id } })
            }
            className="mb-3 flex-row items-center gap-3 rounded-3xl border border-line bg-surface p-4"
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} accessibilityLabel={item.title} className="h-14 w-14 rounded-xl" />
            ) : (
              <View className="h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.accentSoft }}>
                <Layers3 size={22} color={colors.accentDeep} />
              </View>
            )}
            <View className="flex-1">
              <Text weight="bold" numberOfLines={2}>
                {item.title}
              </Text>
              <Text className="mt-1 text-sm text-muted" numberOfLines={2}>
                {item.subtitle}
              </Text>
              <Text className="mt-2 text-xs text-accent-deep">{item.detail}</Text>
            </View>
            <ChevronRight size={18} color={colors.muted} />
          </Pressable>
        )}
        ListEmptyComponent={
          enabled && active.isSuccess ? (
            <View className="gap-3 rounded-3xl bg-surface p-6">
              <Text weight="bold">{tab === 'decks' ? 'Tạo bộ thẻ đầu tiên' : 'Thêm thẻ đầu tiên của bạn'}</Text>
              <Button
                label={tab === 'decks' ? 'Tạo bộ' : 'Tạo thẻ'}
                onPress={() => open(tab === 'decks' ? '/flashcards/deck/edit' : '/flashcards/card/edit')}
              />
            </View>
          ) : undefined
        }
        ListFooterComponent={
          enabled && active.hasNextPage ? (
            <Button
              variant="secondary"
              label="Tải thêm"
              loading={active.isFetchingNextPage}
              onPress={() => void active.fetchNextPage()}
            />
          ) : undefined
        }
      />
    </View>
  );
}
