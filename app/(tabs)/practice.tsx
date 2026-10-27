import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { BookOpen, ChevronRight, Flame, Gamepad2, Layers, Search, Sparkles, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { useAuth } from '@/src/features/auth/auth-provider';
import { vocabApi, type FlashcardDeck } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

export default function PracticeScreen() {
  const { authEnabled, status } = useAuth();
  const canFetch = authEnabled && status === 'authenticated';
  const [query, setQuery] = useState('');
  const decksQuery = useQuery({
    queryKey: ['flashcards', 'decks'],
    queryFn: async () => (await vocabApi.listDecks(0, 50)).items,
    enabled: canFetch,
    staleTime: 30_000,
    retry: 1,
  });
  const searchQuery = useQuery({
    queryKey: ['vocabulary', 'search', query.trim()],
    queryFn: ({ signal }) => vocabApi.search(query.trim(), signal),
    enabled: canFetch && query.trim().length >= 2,
    staleTime: 60_000,
    retry: 1,
  });
  const decks: FlashcardDeck[] = decksQuery.data ?? [];
  const dueTotal = decks.reduce((sum, deck) => sum + (deck.dueCount ?? 0), 0);

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="px-5 pb-28 pt-5" showsVerticalScrollIndicator={false}>
      <View className="mb-5 flex-row items-center justify-between">
        <View><Text weight="bold" className="text-xs uppercase tracking-widest text-accent">GÓC HỌC TẬP</Text><Text weight="black" className="mt-1 text-3xl">Luyện tập</Text><Text className="mt-1 text-sm leading-5 text-muted">Chọn một cách học vừa sức hôm nay.</Text></View>
        <View className="h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.warmSoft }}><Flame size={26} color={colors.accentWarm} fill={colors.accentWarm} /></View>
      </View>

      <Pressable onPress={() => router.push('/games' as never)} accessibilityRole="button" className="overflow-hidden rounded-3xl px-5 py-5" style={{ backgroundColor: colors.heroStart }}>
        <View className="absolute -right-5 -top-7 h-32 w-32 rounded-full" style={{ backgroundColor: colors.heroEnd, opacity: 0.7 }} /><View className="absolute right-24 top-14 h-3 w-3 rounded-full" style={{ backgroundColor: colors.accentWarm }} />
        <View className="flex-row items-center"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Gamepad2 size={24} color="white" /></View><View className="ml-3 flex-1"><Text weight="bold" className="text-xs uppercase tracking-widest text-white/75">HỌC QUA TRÒ CHƠI</Text><Text weight="black" className="mt-1 text-xl text-white">Chơi và luyện phản xạ</Text></View><ChevronRight size={22} color="white" /></View>
        <Text className="mt-3 text-sm leading-5 text-white/85">Wordly và Rocket lấy câu hỏi, phòng chơi cùng bảng điểm trực tiếp từ máy chủ.</Text>
        <View className="mt-4 self-start rounded-full bg-white px-4 py-2.5"><Text weight="bold" className="text-xs" style={{ color: colors.accentDeep }}>Khám phá trò chơi</Text></View>
      </Pressable>

      <View className="mb-3 mt-7 flex-row items-end justify-between"><View><Text weight="black" className="text-xl">Flashcards</Text><Text className="mt-1 text-sm text-muted">Ôn thẻ đến hạn bằng Leitner của bạn</Text></View><View className="items-end"><Text weight="bold" className="text-sm text-accent">{decks.length} bộ</Text><Text className="mt-0.5 text-xs text-muted">{dueTotal} thẻ đến hạn</Text></View></View>
      {!canFetch ? <Card className="border-b-0 bg-surface p-5"><Text weight="bold">Đăng nhập để đồng bộ Flashcards</Text><Text className="mt-2 text-sm leading-5 text-muted">Bộ thẻ và lịch ôn được lưu trên tài khoản của bạn.</Text><Button className="mt-4" label="Đăng nhập" onPress={() => router.push('/(auth)/login' as never)} /></Card> : null}
      {canFetch && decksQuery.isPending ? <View className="items-center py-8"><ActivityIndicator color={colors.accent} /><Text className="mt-2 text-xs text-muted">Đang tải bộ thẻ…</Text></View> : null}
      {canFetch && decksQuery.isError ? <Card className="border-b-0 bg-surface p-5"><Text weight="bold">Không tải được Flashcards</Text><Text className="mt-2 text-sm text-muted">{decksQuery.error.message}</Text><Button className="mt-4" variant="secondary" label="Thử tải lại" onPress={() => void decksQuery.refetch()} /></Card> : null}
      {canFetch && decksQuery.isSuccess && decks.length === 0 ? <Card className="border-b-0 bg-surface p-5"><View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.listeningSoft }}><Layers size={22} color={colors.skill.listening} /></View><Text weight="bold" className="mt-3">Chưa có bộ thẻ</Text><Text className="mt-1 text-sm leading-5 text-muted">Tạo deck trên web rồi các thẻ sẽ đồng bộ về đây.</Text></Card> : null}
      {canFetch ? decks.map((deck, index) => <Pressable key={deck.id} accessibilityRole="button" accessibilityLabel={`Ôn ${deck.name}, ${deck.dueCount} thẻ đến hạn`} onPress={() => router.push({ pathname: '/flashcards/[deckId]', params: { deckId: deck.id, name: deck.name } } as unknown as Href)} className="mb-3">
        <Card className="flex-row items-center gap-3 border-b-0 bg-surface p-4">
          <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: [colors.listeningSoft, colors.warmSoft, colors.successSoft][index % 3] }}><Layers size={22} color={[colors.skill.listening, colors.accentWarm, colors.success][index % 3]} /></View>
          <View className="flex-1"><Text weight="bold" className="text-base">{deck.name}</Text><Text numberOfLines={1} className="mt-1 text-xs text-muted">{deck.description || `${deck.cardCount} thẻ trong bộ`}</Text></View>
          <View className="items-end"><View className="rounded-full px-2.5 py-1" style={{ backgroundColor: colors.accentSoft }}><Text weight="bold" className="text-xs text-accent">{deck.dueCount} đến hạn</Text></View><Text className="mt-1.5 text-[10px] text-muted">{deck.cardCount} thẻ</Text></View>
        </Card>
      </Pressable>) : null}

      <View className="mb-3 mt-5"><Text weight="black" className="text-xl">Tra từ</Text><Text className="mt-1 text-sm text-muted">Tra nghĩa từ vựng IELTS từ kho nội dung.</Text></View>
      <View className="flex-row items-center rounded-2xl border border-line bg-surface px-4"><Search size={18} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Ví dụ: achieve" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} className="ml-2 min-h-12 flex-1 text-base text-ink" returnKeyType="search" /></View>
      {!canFetch && query.trim().length >= 2 ? <Text className="mt-2 text-xs text-muted">Đăng nhập để tra từ trong kho từ vựng.</Text> : null}
      {searchQuery.isFetching ? <ActivityIndicator className="py-5" color={colors.accent} /> : null}
      {searchQuery.isError ? <Card className="mt-3 border-b-0 bg-surface p-4"><Text className="text-sm text-danger">Không tra được từ: {searchQuery.error.message}</Text><Pressable onPress={() => void searchQuery.refetch()} className="mt-2 min-h-11 justify-center"><Text weight="bold" className="text-sm text-accent">Thử lại</Text></Pressable></Card> : null}
      {searchQuery.data?.map((item) => { const sense = item.senses[0]; return <Card key={item.id} className="mt-3 border-b-0 bg-surface p-4"><View className="flex-row items-center"><View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: colors.successSoft }}><BookOpen size={18} color={colors.success} /></View><Text weight="black" className="ml-3 flex-1 text-base text-accent">{item.lemma}</Text>{item.ipa ? <Text className="text-xs text-muted">{item.ipa}</Text> : null}</View>{sense?.vietnameseMeaning ? <Text weight="semibold" className="mt-3 text-sm">{sense.vietnameseMeaning}</Text> : null}{sense?.englishDefinition ? <Text className="mt-1 text-sm leading-5 text-muted">{sense.englishDefinition}</Text> : null}{sense?.exampleSentence ? <Text className="mt-2 rounded-xl p-3 text-xs italic leading-5" style={{ backgroundColor: colors.surfaceTint, color: colors.ink }}>{sense.exampleSentence}</Text> : null}</Card>; })}
      {query.trim().length >= 2 && searchQuery.isSuccess && !searchQuery.data.length ? <View className="items-center py-8"><Sparkles size={24} color={colors.muted} /><Text className="mt-2 text-sm text-muted">Không tìm thấy từ phù hợp.</Text></View> : null}
      <View className="mt-7 flex-row items-center justify-center gap-2"><Zap size={15} color={colors.accentWarm} /><Text className="text-xs text-muted">Luyện một chút mỗi ngày sẽ tạo khác biệt.</Text></View>
    </ScrollView>
  );
}
