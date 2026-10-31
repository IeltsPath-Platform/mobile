import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { BookOpen, ChevronRight, CircleHelp, Flame, Gamepad2, Rocket, Search, Sparkles, Users, Zap } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View, type ScrollViewInstance } from 'react-native';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { useAuth } from '@/src/features/auth/auth-provider';
import { gameApi } from '@/src/features/games/api';
import type { GameCatalog } from '@/src/features/games/types';
import { vocabApi } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

type GameType = 'WORDLY' | 'ROCKET';
const gameInfo: Record<GameType, { title: string; subtitle: string; Icon: typeof Gamepad2; tint: string; foreground: string }> = {
  WORDLY: { title: 'Wordly', subtitle: 'Đoán từ qua gợi ý, rèn phản xạ và vốn từ.', Icon: Gamepad2, tint: colors.accentSoft, foreground: colors.accent },
  ROCKET: { title: 'Rocket', subtitle: 'Chọn đáp án thật nhanh, thi đua cùng bạn bè.', Icon: Rocket, tint: colors.warmSoft, foreground: colors.accentWarm },
};
function availability(status: string) {
  if (status === 'AVAILABLE') return { label: 'ĐANG MỞ', color: colors.success, bg: colors.successSoft };
  if (status === 'COMING_SOON') return { label: 'SẮP RA MẮT', color: colors.muted, bg: colors.surfaceTint };
  if (status === 'MAINTENANCE') return { label: 'ĐANG BẢO TRÌ', color: colors.accentWarm, bg: colors.warmSoft };
  return { label: 'TẠM THỜI ĐÓNG', color: colors.muted, bg: colors.surfaceTint };
}
const matchRoute = (type: string, id: string) => type === 'ROCKET' ? `/games/rocket/${id}` as never : `/games/matches/${id}` as never;

export default function PracticeScreen() {
  const scrollRef = useRef<ScrollViewInstance>(null);
  useFocusEffect(useCallback(() => () => scrollRef.current?.scrollTo({ y: 0, animated: false }), []));
  const { authEnabled, status } = useAuth(); const canFetch = authEnabled && status === 'authenticated'; const [query, setQuery] = useState('');
  const catalog = useQuery({ queryKey: ['games', 'catalog'], queryFn: gameApi.catalog, enabled: canFetch, staleTime: 60_000, retry: 1 });
  const active = useQuery({ queryKey: ['games', 'active'], queryFn: gameApi.activeGame, enabled: canFetch, staleTime: 10_000, retry: 1 });
  const search = useQuery({ queryKey: ['vocabulary', 'search', query.trim()], queryFn: ({ signal }) => vocabApi.search(query.trim(), signal), enabled: canFetch && query.trim().length >= 2, staleTime: 60_000, retry: 1 });
  const games: GameCatalog['games'] = catalog.data?.games.filter((item) => item.gameType === 'WORDLY' || item.gameType === 'ROCKET') ?? [];
  const activeRoute = active.data?.matchId ? matchRoute(active.data.gameType, active.data.matchId) : active.data ? `/games/rooms/${active.data.roomId}` as never : null;
  const openGame = (gameType: GameType, playerMode: 'SOLO' | 'MULTIPLAYER') => router.push({ pathname: '/games', params: { gameType, playerMode } } as never);
  return <ScrollView ref={scrollRef} className="flex-1 bg-canvas" contentContainerClassName="px-5 pb-28 pt-5" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View className="mb-4 flex-row items-center justify-between"><Text className="text-3xl" weight="black">Luyện tập</Text><View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.warmSoft }}><Zap size={22} color={colors.accentWarm}/></View></View>
    <View className="mb-3 mt-1 flex-row items-center gap-2"><View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: colors.accentSoft }}><Gamepad2 size={17} color={colors.accent}/></View><Text className="text-sm tracking-[1.5px] text-accent" weight="black">GAME</Text><View className="h-px flex-1 bg-line" /></View>
    {!canFetch ? <Card className="mb-4 border-b-0 bg-surface p-5"><Text weight="bold">Đăng nhập để chơi</Text><Text className="mt-2 text-sm leading-5 text-muted">Trạng thái game, phòng chơi và kết quả được đồng bộ với tài khoản của bạn.</Text><Button className="mt-4" label="Đăng nhập" onPress={() => router.push('/(auth)/login' as never)}/></Card> : null}
    {canFetch && active.data && activeRoute ? <Pressable onPress={() => router.push(activeRoute)} className="mb-4"><Card className="overflow-hidden border-0 p-4" style={{ backgroundColor: colors.accentSoft }}><View className="flex-row items-center"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-surface"><Gamepad2 size={21} color={colors.accent}/></View><View className="ml-3 flex-1"><Text className="text-xs uppercase tracking-wider text-accent" weight="bold">ĐANG CHƠI</Text><Text className="mt-1 text-base" weight="black">{active.data.gameType === 'ROCKET' ? 'Rocket' : 'Wordly'}{active.data.roomStatus === 'WAITING' ? ` · Phòng ${active.data.roomCode}` : ''}</Text><Text className="mt-1 text-xs text-muted">Chạm để quay lại ván của bạn</Text></View><ChevronRight size={20} color={colors.accent}/></View></Card></Pressable> : null}
    {canFetch && catalog.isPending ? <View className="items-center py-8"><ActivityIndicator color={colors.accent}/><Text className="mt-2 text-sm text-muted">Đang tải trò chơi…</Text></View> : null}
    {canFetch && catalog.isError ? <Card className="mb-4 border-b-0 bg-surface p-4"><Text weight="bold">Chưa tải được danh sách trò chơi</Text><Text className="mt-2 text-sm text-danger">{catalog.error.message}</Text><Button className="mt-4" variant="secondary" label="Thử lại" onPress={() => void catalog.refetch()}/></Card> : null}
    {canFetch && catalog.isSuccess && !games.length ? <Card className="mb-4 items-center border-b-0 bg-surface p-5"><CircleHelp size={24} color={colors.muted}/><Text className="mt-2" weight="bold">Chưa có trò chơi nào</Text><Text className="mt-1 text-center text-sm text-muted">Danh sách trò chơi sẽ xuất hiện khi máy chủ cung cấp.</Text></Card> : null}
    {canFetch && games.map((game) => {
      const type = game.gameType as GameType; const info = gameInfo[type]; const state = availability(game.status); const Icon = info.Icon; const available = game.status === 'AVAILABLE';
      return <Card key={game.gameType} className="mb-3 overflow-hidden border-b-0 bg-surface p-0"><View className="p-4"><View className="flex-row items-center"><View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: info.tint }}><Icon size={23} color={info.foreground}/></View><View className="ml-3 flex-1"><Text className="text-lg" weight="black">{game.name || info.title}</Text><Text className="mt-1 text-xs leading-5 text-muted">{game.description || info.subtitle}</Text></View><View className="rounded-full px-2.5 py-1" style={{ backgroundColor: state.bg }}><Text className="text-[9px]" weight="bold" style={{ color: state.color }}>{state.label}</Text></View></View></View><View className="flex-row border-t border-line px-3 py-2"><Pressable disabled={!available || !canFetch || active.isPending || Boolean(active.data)} onPress={() => openGame(type, 'SOLO')} className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl"><Flame size={16} color={available ? colors.accentWarm : colors.muted}/><Text className="text-xs" weight="bold" style={{ color: available ? colors.ink : colors.muted }}>Chơi một mình</Text></Pressable><View className="my-2 w-px bg-line"/><Pressable disabled={!available || !canFetch || active.isPending || Boolean(active.data)} onPress={() => openGame(type, 'MULTIPLAYER')} className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl"><Users size={16} color={available ? colors.accent : colors.muted}/><Text className="text-xs" weight="bold" style={{ color: available ? colors.ink : colors.muted }}>Chơi cùng bạn</Text></Pressable></View></Card>;
    })}
    {canFetch && active.isError ? <Text className="mb-3 text-xs text-muted">Chưa kiểm tra được ván đang chơi. {active.error.message}</Text> : null}
    {canFetch && active.data && !activeRoute ? <Button className="mb-4" variant="secondary" label="Cập nhật trạng thái ván" onPress={() => void active.refetch()}/> : null}
    <View className="mb-3 mt-5"><Text className="text-xl" weight="black">Tra từ</Text><Text className="mt-1 text-sm text-muted">Tra nghĩa từ vựng IELTS trong kho nội dung.</Text></View><View className="flex-row items-center rounded-2xl border border-line bg-surface px-4"><Search size={18} color={colors.muted}/><TextInput value={query} onChangeText={setQuery} placeholder="Ví dụ: achieve" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} className="ml-2 min-h-12 flex-1 text-base text-ink" returnKeyType="search"/></View>
    {!canFetch && query.trim().length >= 2 ? <Text className="mt-2 text-xs text-muted">Đăng nhập để tra từ trong kho từ vựng.</Text> : null}{search.isFetching ? <ActivityIndicator className="py-5" color={colors.accent}/> : null}{search.isError ? <Card className="mt-3 border-b-0 bg-surface p-4"><Text className="text-sm text-danger">Không tra được từ: {search.error.message}</Text><Pressable onPress={() => void search.refetch()} className="mt-2 min-h-11 justify-center"><Text className="text-sm text-accent" weight="bold">Thử lại</Text></Pressable></Card> : null}
    {search.data?.map((item) => { const sense = item.senses[0]; return <Card key={item.id} className="mt-3 border-b-0 bg-surface p-4"><View className="flex-row items-center"><View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: colors.successSoft }}><BookOpen size={18} color={colors.success}/></View><Text className="ml-3 flex-1 text-base text-accent" weight="black">{item.lemma}</Text>{item.ipa ? <Text className="text-xs text-muted">{item.ipa}</Text> : null}</View>{sense?.vietnameseMeaning ? <Text className="mt-3 text-sm" weight="semibold">{sense.vietnameseMeaning}</Text> : null}{sense?.englishDefinition ? <Text className="mt-1 text-sm leading-5 text-muted">{sense.englishDefinition}</Text> : null}{sense?.exampleSentence ? <Text className="mt-2 rounded-xl p-3 text-xs italic leading-5" style={{ backgroundColor: colors.surfaceTint, color: colors.ink }}>{sense.exampleSentence}</Text> : null}</Card>; })}
    {query.trim().length >= 2 && search.isSuccess && !search.data.length ? <View className="items-center py-8"><Sparkles size={24} color={colors.muted}/><Text className="mt-2 text-sm text-muted">Không tìm thấy từ phù hợp.</Text></View> : null}
  </ScrollView>;
}
