import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { ChevronRight, Gamepad2, Layers, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { useAuth } from '@/src/features/auth/auth-provider';
import { MOCK_DECKS, MOCK_VOCAB, vocabApi, type FlashcardDeck, type VocabularyItem } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

export default function PracticeScreen() {
  const { authEnabled, status } = useAuth();
  const canFetch = authEnabled && status === 'authenticated';
  const [query, setQuery] = useState('');
  const [showSamples, setShowSamples] = useState(false);

  const decksQuery = useQuery({
    queryKey: ['decks'],
    queryFn: () => vocabApi.listDecks(),
    enabled: canFetch,
    retry: 1,
  });

  const usingMock = !canFetch || decksQuery.isError;
  const decks: FlashcardDeck[] = usingMock || showSamples ? MOCK_DECKS : (decksQuery.data ?? []);
  const empty = canFetch && decksQuery.isSuccess && (decksQuery.data?.length ?? 0) === 0 && !showSamples;

  const searchQuery = useQuery({
    queryKey: ['vocab', 'search', query],
    queryFn: () => vocabApi.search(query.trim()),
    enabled: canFetch && query.trim().length >= 2,
    retry: 1,
  });

  const results: VocabularyItem[] = useMemo(() => {
    if (!query.trim()) return [];
    if (canFetch && searchQuery.data) return searchQuery.data;
    if (canFetch && searchQuery.isFetching) return [];
    const q = query.trim().toLowerCase();
    return MOCK_VOCAB.filter(
      (item) =>
        item.lemma.toLowerCase().includes(q) ||
        item.senses.some((sense) => sense.vietnameseMeaning?.toLowerCase().includes(q)),
    );
  }, [canFetch, query, searchQuery.data, searchQuery.isFetching]);

  const showingMockSearch = !canFetch || Boolean(searchQuery.error);

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="px-5 pb-28 pt-5" showsVerticalScrollIndicator={false}>
      <View className="mb-4">
        <Text weight="semibold" className="text-xs uppercase tracking-widest text-accent">GÓC HỌC TẬP</Text>
        <Text weight="black" className="mt-1 text-2xl leading-8">Luyện tập</Text>
        <Text className="mt-1 text-sm leading-5 text-muted">Chọn một hoạt động để giữ nhịp học hôm nay.</Text>
      </View>

      <Pressable onPress={() => router.push('/games' as never)} accessibilityRole="button" className="overflow-hidden rounded-3xl bg-accent-deep px-5 py-5">
        <View className="flex-row items-center">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Gamepad2 size={23} color="white" /></View>
          <View className="ml-3 flex-1"><Text weight="bold" className="text-xs uppercase tracking-wide text-white/75">HỌC QUA TRÒ CHƠI</Text><Text weight="black" className="mt-1 text-xl text-white">Thử thách Wordly</Text></View>
          <ChevronRight size={21} color="white" />
        </View>
        <Text className="mt-3 text-sm leading-5 text-white/85">Ôn từ vựng qua câu đố nhanh, chơi một mình hoặc cùng bạn bè.</Text>
        <View className="mt-4 self-start rounded-full bg-white px-4 py-2.5"><Text weight="bold" className="text-xs text-accent-deep">Chọn chế độ chơi</Text></View>
      </Pressable>

      <View className="mb-1 mt-7 flex-row items-end justify-between"><View><Text weight="black" className="text-xl">Flashcards</Text><Text className="mt-1 text-sm text-muted">Ôn tập theo bộ thẻ của bạn</Text></View><View className="rounded-full bg-accent-soft px-3 py-1.5"><Text weight="bold" className="text-xs text-accent">{decks.length} bộ</Text></View></View>

      {usingMock ? (
        <Text className="mt-3 text-xs text-muted">Nguồn: bộ mẫu (chưa đăng nhập hoặc API lỗi)</Text>
      ) : null}

      {decksQuery.isPending && canFetch ? (
        <View className="mt-8 items-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}

      {empty ? (
        <Card className="mt-5">
          <Text weight="extrabold" className="text-base">
            Chưa có bộ thẻ
          </Text>
          <Text className="mt-1 text-sm text-muted">Tạo deck trên web, hoặc học thử bộ mẫu trên máy này.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowSamples(true)}
            className="mt-4 min-h-12 items-center justify-center rounded-2xl bg-accent">
            <Text weight="extrabold" className="text-white">
              Học bộ mẫu
            </Text>
          </Pressable>
        </Card>
      ) : null}

      <View className="mt-3 gap-3">
        {decks.map((deck) => (
          <Pressable
            key={deck.id}
            accessibilityRole="button"
            accessibilityLabel={`Học bộ ${deck.name}`}
            onPress={() =>
              router.push({
                pathname: '/flashcards/[deckId]',
                params: { deckId: deck.id, name: deck.name },
              } as unknown as Href)
            }>
            <Card className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#e8effc]">
                <Layers size={22} color={colors.skill.listening} />
              </View>
              <View className="flex-1">
                <Text weight="extrabold" className="text-base">
                  {deck.name}
                </Text>
                {deck.description ? <Text className="mt-0.5 text-sm text-muted">{deck.description}</Text> : null}
              </View>
              <Text weight="extrabold" className="text-sm text-accent">
                Học
              </Text>
            </Card>
          </Pressable>
        ))}
      </View>

      <Text weight="black" className="mb-2 mt-8 text-xl">Tra từ</Text><Text className="-mt-1 mb-3 text-sm text-muted">Tìm nhanh nghĩa và cách dùng</Text>
      <View className="flex-row items-center rounded-2xl border border-line bg-surface px-3 py-2.5">
        <Search size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tra từ IELTS (vd: achieve)"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          className="ml-2 flex-1 py-1 text-base text-ink"
        />
      </View>
      {query.trim().length > 0 ? (
        <Text className="mt-2 text-xs text-muted">
          {showingMockSearch ? 'Nguồn: mock local (hoặc API lỗi)' : 'Nguồn: BE vocabulary'}
        </Text>
      ) : null}

      {results.map((item) => {
        const sense = item.senses[0];
        return (
          <Card key={item.id} className="mt-3">
            <Text weight="extrabold" className="text-base text-accent">
              {item.lemma}
              {item.ipa ? (
                <Text weight="medium" className="text-sm text-muted">
                  {' '}
                  {item.ipa}
                </Text>
              ) : null}
            </Text>
            {sense?.vietnameseMeaning ? <Text className="mt-1 text-sm text-ink">{sense.vietnameseMeaning}</Text> : null}
            {sense?.englishDefinition ? <Text className="mt-0.5 text-xs text-muted">{sense.englishDefinition}</Text> : null}
          </Card>
        );
      })}
    </ScrollView>
  );
}
