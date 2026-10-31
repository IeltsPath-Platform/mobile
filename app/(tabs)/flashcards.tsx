import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { BookOpenCheck, ChevronRight, Layers3, Plus, RotateCcw, Sparkles } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { useAuth } from '@/src/features/auth/auth-provider';
import { listActiveDecks, vocabApi, type FlashcardDeck } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

type Tab = 'decks' | 'cards';
const deckColors = [colors.listeningSoft, colors.warmSoft, colors.successSoft];
const deckInk = [colors.skill.listening, colors.accentWarm, colors.success];

export default function FlashcardsScreen() {
  const scrollRef = useRef<ScrollViewInstance>(null);
  useFocusEffect(useCallback(() => () => scrollRef.current?.scrollTo({ y: 0, animated: false }), []));
  const { authEnabled, status } = useAuth();
  const enabled = authEnabled && status === 'authenticated';
  const [tab, setTab] = useState<Tab>('decks');
  const client = useQueryClient();
  const decks = useQuery({ queryKey: ['flashcards', 'decks'], queryFn: listActiveDecks, enabled, staleTime: 30_000 });
  const cards = useQuery({ queryKey: ['flashcards', 'cards', 'ACTIVE'], queryFn: async () => (await vocabApi.listCards(0, 50)).items, enabled, staleTime: 30_000 });
  const deckList = decks.data ?? [];
  const cardList = cards.data ?? [];
  const due = deckList.reduce((sum, deck) => sum + (deck.dueCount ?? 0), 0);
  const currentQuery = tab === 'decks' ? decks : cards;
  const openCreate = (kind: Tab = tab) => {
    if (status === 'loading') return;
    if (!enabled) { router.push('/(auth)/login' as never); return; }
    router.push(kind === 'decks' ? '/flashcards/deck/edit' : '/flashcards/card/edit');
  };

  return (
    <ScrollView ref={scrollRef} className="flex-1 bg-canvas" contentContainerClassName="px-5 pb-28 pt-3" showsVerticalScrollIndicator={false}>
      <View className="mb-5 flex-row items-center justify-between">
        <View>
          <Text className="text-[25px] leading-8" weight="black">Flashcards</Text>
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.listeningSoft }}><BookOpenCheck size={21} color={colors.skill.listening}/></View>
      </View>

      <View className="overflow-hidden rounded-[28px] p-5" style={{ backgroundColor: colors.heroStart }}>
        <View className="absolute -right-8 -top-10 h-40 w-40 rounded-full" style={{ backgroundColor: colors.heroEnd, opacity: 0.28 }}/>
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/15"><RotateCcw size={21} color="white"/></View>
          <View className="flex-1"><Text className="text-[10px] uppercase tracking-[1.6px] text-white/70" weight="bold">HÔM NAY</Text><Text className="mt-1 text-xl text-white" weight="black">{due} thẻ đến hạn</Text></View>
          <Sparkles size={21} color="#ffd68a"/>
        </View>
        <Text className="mt-3 text-sm leading-5 text-white/75">Ôn đều mỗi ngày để từ mới ở lại lâu hơn.</Text>
        <Pressable accessibilityRole="button" onPress={() => due > 0 ? router.push('/flashcards/study') : setTab('decks')} className="mt-4 min-h-11 flex-row items-center justify-center gap-2 self-start rounded-full bg-white px-5">
          <Text weight="bold" className="text-accent-deep">{due > 0 ? 'Bắt đầu ôn' : 'Xem bộ thẻ'}</Text><ChevronRight size={16} color={colors.accentDeep}/>
        </Pressable>
      </View>

      <View className="mt-5 flex-row gap-3">
        <Pressable accessibilityRole="button" onPress={() => openCreate('decks')} className="min-h-[82px] flex-1 flex-row items-center gap-3 rounded-3xl border border-line bg-surface p-4 active:opacity-80">
          <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.listeningSoft }}><Layers3 size={20} color={colors.skill.listening}/></View>
          <View className="flex-1"><Text weight="bold">Tạo bộ thẻ</Text><Text className="mt-1 text-xs text-muted">Gom theo chủ đề</Text></View>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => openCreate('cards')} className="min-h-[82px] flex-1 flex-row items-center gap-3 rounded-3xl border border-line bg-surface p-4 active:opacity-80">
          <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.warmSoft }}><Plus size={20} color={colors.accentWarm}/></View>
          <View className="flex-1"><Text weight="bold">Tạo thẻ</Text><Text className="mt-1 text-xs text-muted">Thêm từ cần nhớ</Text></View>
        </Pressable>
      </View>

      <View className="mt-6 flex-row rounded-2xl bg-surfaceTint p-1">
        {([{ id: 'decks', label: 'Bộ thẻ' }, { id: 'cards', label: 'Thẻ của tôi' }] as const).map((item) => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: tab === item.id }} onPress={() => setTab(item.id)} className={`min-h-11 flex-1 items-center justify-center rounded-xl ${tab === item.id ? 'bg-surface' : ''}`}><Text weight="bold" className={tab === item.id ? 'text-accent-deep' : 'text-muted'}>{item.label}</Text></Pressable>)}
      </View>

      <View className="mb-3 mt-5 flex-row items-end justify-between">
        <View className="flex-1 pr-3"><Text className="text-xl" weight="black">{tab === 'decks' ? 'Bộ học của bạn' : 'Thư viện thẻ'}</Text><Text className="mt-1 text-sm text-muted">{tab === 'decks' ? `${deckList.length} bộ · ${due} thẻ cần ôn` : `${cardList.length} thẻ đang hoạt động`}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={tab === 'decks' ? 'Tạo bộ thẻ' : 'Tạo thẻ'} onPress={() => openCreate()} className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.accent }}><Plus size={22} color="white"/></Pressable>
      </View>

      {!enabled ? <Card className="border-line bg-surface"><Text weight="bold">Đăng nhập để đồng bộ Flashcards</Text><Text className="mt-2 text-sm leading-5 text-muted">Bộ thẻ và tiến độ ôn tập được lưu trong tài khoản của bạn.</Text><Button className="mt-4" label="Đăng nhập" onPress={() => router.push('/(auth)/login' as never)}/></Card> : null}
      {enabled && currentQuery.isPending ? <View className="items-center py-10"><ActivityIndicator color={colors.accent}/><Text className="mt-3 text-sm text-muted">Đang tải thư viện…</Text></View> : null}
      {enabled && currentQuery.isError ? <Card className="border-line bg-surface"><Text weight="bold">Chưa tải được thư viện</Text><Text className="mt-2 text-sm text-danger">{currentQuery.error.message}</Text><Button variant="secondary" className="mt-4" label="Thử lại" onPress={() => void currentQuery.refetch()}/></Card> : null}

      {enabled && tab === 'decks' && deckList.map((deck: FlashcardDeck, index) => <Pressable key={deck.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/flashcards/deck/[deckId]', params: { deckId: deck.id } })} className="mb-3 active:opacity-80">
        <Card className="flex-row items-center gap-3 border-line bg-surface p-4">
          {deck.coverImageUrl ? <Image source={{ uri: deck.coverImageUrl }} accessibilityLabel={`Ảnh bìa ${deck.name}`} className="h-[58px] w-[58px] rounded-2xl" resizeMode="cover"/> : <View className="h-[58px] w-[58px] items-center justify-center rounded-2xl" style={{ backgroundColor: deckColors[index % deckColors.length] }}><Layers3 size={23} color={deckInk[index % deckInk.length]}/></View>}
          <View className="flex-1"><Text numberOfLines={1} weight="bold" className="text-base">{deck.name}</Text><Text numberOfLines={1} className="mt-1 text-xs text-muted">{deck.description || `${deck.cardCount} thẻ trong bộ`}</Text><Text className="mt-2 text-xs text-accent-deep" weight="bold">{deck.dueCount} thẻ cần ôn</Text></View>
          <View className="items-end"><Text className="text-sm" weight="black">{deck.cardCount}</Text><Text className="text-[10px] text-muted">thẻ</Text></View><ChevronRight size={18} color={colors.muted}/>
        </Card>
      </Pressable>)}
      {enabled && tab === 'cards' && cardList.map((card) => <Pressable key={card.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/flashcards/card/edit', params: { cardId: card.id } })} className="mb-3 active:opacity-80">
        <Card className="flex-row items-center gap-3 border-line bg-surface p-4">{card.imageUrl ? <Image source={{ uri: card.imageUrl }} accessibilityLabel={`Ảnh minh họa ${card.front}`} className="h-12 w-12 rounded-xl" resizeMode="cover"/> : <View className="h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: colors.successSoft }}><BookOpenCheck size={19} color={colors.success}/></View>}<View className="flex-1"><Text numberOfLines={1} weight="bold">{card.front}</Text><Text numberOfLines={1} className="mt-1 text-sm text-muted">{card.back}</Text></View><ChevronRight size={18} color={colors.muted}/></Card>
      </Pressable>)}

      {enabled && currentQuery.isSuccess && !(tab === 'decks' ? deckList.length : cardList.length) ? <Card className="mt-1 items-center border-line bg-surface px-6 py-8">
        <View className="h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.accentSoft }}><Sparkles size={25} color={colors.accentDeep}/></View>
        <Text className="mt-3 text-center" weight="bold">{tab === 'decks' ? 'Tạo bộ thẻ đầu tiên' : 'Thêm thẻ đầu tiên của bạn'}</Text>
        <Text className="mt-2 text-center text-sm leading-5 text-muted">Lưu từ mới của riêng bạn rồi ôn tập theo lịch thông minh.</Text>
        <Button className="mt-4" label={tab === 'decks' ? 'Tạo bộ thẻ' : 'Tạo thẻ mới'} onPress={() => openCreate()}/>
      </Card> : null}
      {enabled ? <Pressable onPress={() => { void client.invalidateQueries({ queryKey: ['flashcards'] }); }} className="mt-3 min-h-11 items-center justify-center"><Text className="text-xs text-muted">Làm mới thư viện</Text></Pressable> : null}
    </ScrollView>
  );
}
