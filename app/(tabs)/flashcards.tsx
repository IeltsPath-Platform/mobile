import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  BookMarked,
  BookOpen,
  ChartNoAxesColumn,
  Check,
  ChevronRight,
  Layers3,
  Plus,
  RotateCcw,
} from 'lucide-react-native';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { DictionaryLookup } from '@/src/features/flashcards/components/dictionary-lookup';
import {
  FlashcardSignIn,
  QueryState,
} from '@/src/features/flashcards/components/query-state';
import { notebookApi } from '@/src/features/flashcards/notebook-api';
import {
  nextPage,
  useFlashcardAccess,
  useStudyTimezone,
} from '@/src/features/flashcards/queries';
import { vocabApi } from '@/src/features/vocab/api';
import { useTabBarScrollHandler } from '@/src/components/navigation/tab-reselect-context';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

type Tab = 'decks' | 'cards';
type LibraryRow = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  detail: string;
};

export default function FlashcardsScreen() {
  useTheme();
  const listRef = useRef<FlatList<LibraryRow>>(null);
  const handleTabBarScroll = useTabBarScrollHandler();
  const enabled = useFlashcardAccess();
  const timezone = useStudyTimezone();
  const [tab, setTab] = useState<Tab>('decks');

  const decks = useInfiniteQuery({
    queryKey: ['flashcards', 'deck-pages'],
    queryFn: ({ pageParam, signal }) =>
      vocabApi.listDecks(pageParam, 30, 'ACTIVE', signal),
    initialPageParam: 0,
    getNextPageParam: nextPage,
    enabled: enabled && tab === 'decks',
    staleTime: 30_000,
  });
  const cards = useInfiniteQuery({
    queryKey: ['flashcards', 'card-pages'],
    queryFn: ({ pageParam, signal }) =>
      vocabApi.listCards(pageParam, 30, 'ACTIVE', signal),
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
    queryKey: ['flashcards', 'notebook', 'summary', timezone],
    queryFn: () => notebookApi.summary(timezone),
    enabled,
    staleTime: 60_000,
  });

  const active = tab === 'decks' ? decks : cards;
  const rows = useMemo<LibraryRow[]>(
    () =>
      tab === 'decks'
        ? (decks.data?.pages.flatMap((page) => page.items) ?? []).map(
            (deck) => ({
              id: deck.id,
              title: deck.name,
              subtitle: deck.description || `${deck.cardCount} thẻ`,
              imageUrl: deck.coverImageUrl ?? null,
              detail: `${deck.dueCount} thẻ cần ôn`,
            }),
          )
        : (cards.data?.pages.flatMap((page) => page.items) ?? []).map(
            (card) => ({
              id: card.id,
              title: card.front,
              subtitle: card.back,
              imageUrl: card.imageUrl ?? null,
              detail: `${card.reviewCount} lượt ôn`,
            }),
          ),
    [tab, decks.data, cards.data],
  );
  const open = (
    route:
      | '/flashcards/deck/edit'
      | '/flashcards/card/edit'
      | '/flashcards/notebook'
      | '/flashcards/progress',
  ) => router.push(enabled ? route : '/(auth)/login');

  const openRow = useCallback(
    (id: string) =>
      tab === 'decks'
        ? router.push({ pathname: '/flashcards/deck/[deckId]', params: { deckId: id } })
        : router.push({ pathname: '/flashcards/card/edit', params: { cardId: id } }),
    [tab],
  );

  const hasNotebook =
    enabled && notebookSummary.data && notebookSummary.data.total > 0;
  const notebookDue = notebookSummary.data?.dueNow ?? 0;

  return (
    <View className="flex-1 bg-canvas">
      <FlatList
        ref={listRef}
        onScroll={handleTabBarScroll}
        scrollEventThrottle={16}
        data={enabled ? rows : []}
        keyExtractor={(row) => row.id}
        contentContainerClassName="px-5 pb-10 pt-3"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshing={
          enabled && active.isRefetching && !active.isFetchingNextPage
        }
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
            <Text
              accessibilityRole="header"
              className="text-[28px]"
              weight="black"
            >
              Thẻ từ
            </Text>

            <DictionaryLookup enabled={enabled} onRequireLogin={() => router.push('/(auth)/login')} />

            {/* Notebook card — entry point chính */}
            {hasNotebook ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => open('/flashcards/notebook')}
                className="rounded-3xl active:opacity-80"
                style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderBottomColor: colors.edge, backgroundColor: colors.surface }}
              >
                <View className="flex-row items-center gap-3 p-4">
                  <View
                    className="h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: colors.accentSoft }}
                  >
                    <BookMarked size={26} color={colors.accentDeep} />
                  </View>
                  <View className="flex-1">
                    <Text weight="black" className="text-lg">
                      Sổ từ của bạn
                    </Text>
                    <Text className="mt-0.5 text-sm text-muted">
                      {notebookSummary.data!.total} từ đã lưu
                      {notebookDue > 0 ? ` · ${notebookDue} từ cần ôn` : ' · Đã ôn hết'}
                    </Text>
                  </View>
                  <ChevronRight size={22} color={colors.muted} />
                </View>
              </Pressable>
            ) : null}

            {/* Banner thẻ deck đến hạn */}
            {enabled ? (
              <View
                className="overflow-hidden rounded-3xl"
                style={{ backgroundColor: due.data && due.data.total > 0 ? colors.accentWarm : colors.success }}
              >
                <View style={{ position: 'absolute', right: -30, top: -36, width: 140, height: 140, borderRadius: 70, backgroundColor: '#ffffff', opacity: 0.15 }} />
                <View className="p-5">
                  <View className="flex-row items-center gap-3">
                    <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
                      {due.data && due.data.total === 0 ? (
                        <Check size={28} color={colors.success} strokeWidth={3.5} />
                      ) : (
                        <RotateCcw size={26} color={colors.accentWarm} strokeWidth={2.8} />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs uppercase tracking-wider" weight="black" style={{ color: '#ffffff', opacity: 0.85 }}>
                        Ôn tập hôm nay
                      </Text>
                      <Text className="text-xl" weight="black" style={{ color: '#ffffff' }}>
                        {due.data
                          ? due.data.total > 0
                            ? `${due.data.total} thẻ đến hạn`
                            : 'Đã ôn hết thẻ!'
                          : 'Thẻ đến hạn'}
                      </Text>
                    </View>
                  </View>
                  {due.data && due.data.total > 0 ? (
                    <Button
                      className="mt-4"
                      variant="secondary"
                      label="Ôn ngay"
                      onPress={() => router.push('/flashcards/study')}
                    />
                  ) : null}
                  <QueryState
                    pending={due.isPending}
                    error={due.error}
                    retry={() => void due.refetch()}
                  />
                </View>
              </View>
            ) : (
              <FlashcardSignIn />
            )}

            {enabled && notebookSummary.isError ? (
              <QueryState
                pending={false}
                error={notebookSummary.error}
                retry={() => void notebookSummary.refetch()}
              />
            ) : null}
            {/* Nút nhanh */}
            <View className="flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                onPress={() => open('/flashcards/notebook')}
                className="min-h-14 flex-1 flex-row items-center justify-center gap-2 rounded-2xl active:opacity-80"
                style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderBottomColor: colors.edge, backgroundColor: colors.surface }}
              >
                <BookOpen size={20} color={colors.accentDeep} />
                <Text weight="extrabold" className="text-sm">
                  Sổ từ
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => open('/flashcards/progress')}
                className="min-h-14 flex-1 flex-row items-center justify-center gap-2 rounded-2xl active:opacity-80"
                style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderBottomColor: colors.edge, backgroundColor: colors.surface }}
              >
                <ChartNoAxesColumn size={20} color={colors.accentDeep} />
                <Text weight="extrabold" className="text-sm">
                  Tiến độ
                </Text>
              </Pressable>
            </View>

            {/* Tab Bộ thẻ / Thẻ của tôi */}
            <View className="flex-row items-center gap-2">
              {(
                [
                  { id: 'decks', label: 'Bộ thẻ' },
                  { id: 'cards', label: 'Thẻ của tôi' },
                ] as const
              ).map((item) => {
                const selected = tab === item.id;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setTab(item.id);
                      listRef.current?.scrollToOffset({ offset: 0, animated: false });
                    }}
                    className="min-h-12 flex-1 items-center justify-center rounded-2xl active:opacity-80"
                    style={{
                      borderWidth: 2,
                      borderBottomWidth: 4,
                      borderColor: selected ? colors.accent : colors.line,
                      borderBottomColor: selected ? colors.accentShade : colors.edge,
                      backgroundColor: selected ? colors.accentSoft : colors.surface,
                    }}
                  >
                    <Text weight="extrabold" style={{ color: selected ? colors.accentDeep : colors.muted }}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tab === 'decks' ? 'Tạo bộ thẻ' : 'Tạo thẻ'}
                onPress={() => open(tab === 'decks' ? '/flashcards/deck/edit' : '/flashcards/card/edit')}
                className="h-12 w-12 items-center justify-center rounded-2xl active:opacity-80"
                style={{ backgroundColor: colors.accent, borderBottomWidth: 4, borderBottomColor: colors.accentShade }}
              >
                <Plus size={24} color={colors.canvas} strokeWidth={3} />
              </Pressable>
            </View>
            {enabled ? (
              <QueryState
                pending={active.isPending}
                error={active.error}
                retry={() => void active.refetch()}
              />
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <LibraryRowItem
            row={item}
            onPress={openRow}
          />
        )}
        ListEmptyComponent={
          enabled && active.isSuccess ? (
            <View className="items-center gap-3 rounded-3xl p-6" style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderBottomColor: colors.edge, backgroundColor: colors.surface }}>
              <Image source={require('@/assets/images/owl/nav-owl-stand.webp')} contentFit="contain" style={{ width: 96, height: 96 }} accessibilityIgnoresInvertColors />
              <Text weight="black" className="text-lg">
                {tab === 'decks'
                  ? 'Tạo bộ thẻ đầu tiên'
                  : 'Thêm thẻ đầu tiên của bạn'}
              </Text>
              <Button
                label={tab === 'decks' ? 'Tạo bộ' : 'Tạo thẻ'}
                onPress={() =>
                  open(
                    tab === 'decks'
                      ? '/flashcards/deck/edit'
                      : '/flashcards/card/edit',
                  )
                }
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

const LibraryRowItem = memo(function LibraryRowItem({
  row,
  onPress,
}: {
  row: LibraryRow;
  onPress: (id: string) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.title}. ${row.detail}`}
      onPress={() => onPress(row.id)}
      className="mb-3 min-h-11 flex-row items-center gap-3 rounded-3xl p-4 active:opacity-80"
      style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderBottomColor: colors.edge, backgroundColor: colors.surface }}
    >
      {row.imageUrl ? (
        <Image
          source={{ uri: row.imageUrl }}
          accessibilityIgnoresInvertColors
          contentFit="cover"
          style={{ width: 56, height: 56, borderRadius: 12 }}
        />
      ) : (
        <View
          className="h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: colors.accentSoft }}
        >
          <Layers3 size={22} color={colors.accentDeep} />
        </View>
      )}
      <View className="flex-1">
        <Text weight="bold" numberOfLines={2}>
          {row.title}
        </Text>
        <Text className="mt-1 text-sm text-muted" numberOfLines={2}>
          {row.subtitle}
        </Text>
        <Text className="mt-2 text-xs text-accent-deep">{row.detail}</Text>
      </View>
      <ChevronRight size={18} color={colors.muted} />
    </Pressable>
  );
});
