import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, CircleHelp, Flame, Gamepad2, Rocket, Users } from 'lucide-react-native';
import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { useAuth } from '@/src/features/auth/auth-provider';
import { gameApi } from '@/src/features/games/api';
import type { GameCatalog } from '@/src/features/games/types';
import { haptics } from '@/src/lib/haptics';
import { sound } from '@/src/lib/sound';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';
import { useTabBarScrollHandler } from '@/src/components/navigation/tab-reselect-context';

type GameType = 'WORDLY' | 'ROCKET';
type PlayerMode = 'SOLO' | 'MULTIPLAYER';
type GameEntry = GameCatalog['games'][number];

const gameInfo = (): Record<GameType, { title: string; subtitle: string; Icon: typeof Gamepad2; tint: string; foreground: string; solid: string }> => ({
  WORDLY: { title: 'Wordly', subtitle: 'Đoán từ qua gợi ý, rèn phản xạ và vốn từ.', Icon: Gamepad2, tint: colors.accentSoft, foreground: colors.accent, solid: colors.success },
  ROCKET: { title: 'Rocket', subtitle: 'Chọn đáp án thật nhanh, thi đua cùng bạn bè.', Icon: Rocket, tint: colors.warmSoft, foreground: colors.accentWarm, solid: colors.accentWarm },
});

function availability(status: string) {
  if (status === 'AVAILABLE') return { label: 'ĐANG MỞ', color: colors.success, bg: colors.successSoft };
  if (status === 'COMING_SOON') return { label: 'SẮP RA MẮT', color: colors.muted, bg: colors.surfaceTint };
  if (status === 'MAINTENANCE') return { label: 'ĐANG BẢO TRÌ', color: colors.accentWarm, bg: colors.warmSoft };
  return { label: 'TẠM THỜI ĐÓNG', color: colors.muted, bg: colors.surfaceTint };
}

const matchRoute = (type: string, id: string) =>
  (type === 'ROCKET' ? `/games/rocket/${id}` : `/games/matches/${id}`) as never;

export default function PracticeScreen() {
  useTheme();
  const info = gameInfo();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const handleTabBarScroll = useTabBarScrollHandler();
  useFocusEffect(useCallback(() => () => scrollRef.current?.scrollTo({ y: 0, animated: false }), []));
  const { authEnabled, status } = useAuth();
  const canFetch = authEnabled && status === 'authenticated';
  const catalog = useQuery({ queryKey: ['games', 'catalog'], queryFn: gameApi.catalog, enabled: canFetch, staleTime: 60_000, retry: 1 });
  const active = useQuery({ queryKey: ['games', 'active'], queryFn: gameApi.activeGame, enabled: canFetch, staleTime: 10_000, retry: 1 });
  const games = useMemo<GameEntry[]>(
    () => catalog.data?.games.filter((item) => item.gameType === 'WORDLY' || item.gameType === 'ROCKET') ?? [],
    [catalog.data],
  );
  const activeGame = active.data;
  const activeRoute = activeGame
    ? activeGame.matchId
      ? matchRoute(activeGame.gameType, activeGame.matchId)
      : (`/games/rooms/${activeGame.roomId}` as never)
    : null;

  const openGame = (gameType: GameType, playerMode: PlayerMode) => {
    haptics.tap();
    void sound.play('tap');
    router.push({ pathname: '/games', params: { gameType, playerMode } } as never);
  };

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={handleTabBarScroll}
      scrollEventThrottle={16}
      className="flex-1 bg-canvas"
      contentContainerClassName="px-5 pb-8 pt-4"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        canFetch ? (
          <RefreshControl
            refreshing={(catalog.isRefetching || active.isRefetching) && !catalog.isPending}
            onRefresh={() => {
              void catalog.refetch();
              void active.refetch();
            }}
            tintColor={colors.accent}
          />
        ) : undefined
      }
    >
      <Text accessibilityRole="header" className="text-[28px] text-ink" weight="black">
        Luyện tập
      </Text>
      <Text className="mb-5 mt-1 text-sm text-muted">Chơi một ván ngắn để nhớ từ lâu hơn.</Text>

      {!canFetch ? (
        <Card className="mb-4 border-b-0 bg-surface p-5">
          <Text weight="bold">Đăng nhập để chơi</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">
            Trạng thái game, phòng chơi và kết quả được đồng bộ với tài khoản của bạn.
          </Text>
          <Button className="mt-4" label="Đăng nhập" onPress={() => router.push('/(auth)/login' as never)} />
        </Card>
      ) : null}

      {canFetch && activeGame && activeRoute ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại ván đang chơi"
          onPress={() => router.push(activeRoute)}
          className="mb-4"
        >
          <Card className="overflow-hidden p-4" style={{ backgroundColor: colors.successSoft, borderColor: colors.success, borderBottomColor: colors.successShade }}>
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.success }}>
                <Gamepad2 size={22} color={colors.canvas} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-xs uppercase tracking-wider" weight="black" style={{ color: colors.success }}>
                  ĐANG CHƠI
                </Text>
                <Text className="mt-1 text-base" weight="black">
                  {activeGame.gameType === 'ROCKET' ? 'Rocket' : 'Wordly'}
                  {activeGame.roomStatus === 'WAITING' ? ` · Phòng ${activeGame.roomCode}` : ''}
                </Text>
                <Text className="mt-1 text-xs text-muted">Chạm để quay lại ván của bạn</Text>
              </View>
              <ChevronRight size={22} color={colors.success} />
            </View>
          </Card>
        </Pressable>
      ) : null}

      {canFetch && catalog.isPending ? (
        <View className="items-center py-8">
          <ActivityIndicator color={colors.accent} />
          <Text className="mt-2 text-sm text-muted">Đang tải trò chơi…</Text>
        </View>
      ) : null}

      {canFetch && catalog.isError ? (
        <Card className="mb-4 border-b-0 bg-surface p-4">
          <Text weight="bold">Chưa tải được danh sách trò chơi</Text>
          <Text className="mt-2 text-sm text-danger">{catalog.error.message}</Text>
          <Button className="mt-4" variant="secondary" label="Thử lại" onPress={() => void catalog.refetch()} />
        </Card>
      ) : null}

      {canFetch && catalog.isSuccess && !games.length ? (
        <Card className="mb-4 items-center border-b-0 bg-surface p-5">
          <CircleHelp size={24} color={colors.muted} />
          <Text className="mt-2" weight="bold">
            Chưa có trò chơi nào
          </Text>
          <Text className="mt-1 text-center text-sm text-muted">
            Danh sách trò chơi sẽ xuất hiện khi máy chủ cung cấp.
          </Text>
        </Card>
      ) : null}

      {canFetch
        ? games.map((game) => {
            const type = game.gameType as GameType;
            const meta = info[type];
            const state = availability(game.status);
            const playable = game.status === 'AVAILABLE' && !active.isPending && !activeGame;
            const name = game.name || meta.title;
            return (
              <View key={game.gameType} className="mb-5">
                <View
                  style={{
                    borderRadius: 28,
                    borderWidth: 2,
                    borderBottomWidth: 4,
                    borderColor: colors.line,
                    borderBottomColor: colors.edge,
                    backgroundColor: colors.surface,
                    overflow: 'hidden',
                  }}>
                  <View style={{ backgroundColor: meta.solid, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18, overflow: 'hidden' }}>
                    <View style={{ position: 'absolute', right: -30, top: -34, width: 140, height: 140, borderRadius: 70, backgroundColor: '#ffffff', opacity: 0.14 }} />
                    <View style={{ position: 'absolute', right: 40, bottom: -50, width: 100, height: 100, borderRadius: 50, backgroundColor: '#ffffff', opacity: 0.1 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
                        <meta.Icon size={32} color={meta.solid} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text className="text-2xl" weight="black" style={{ color: '#ffffff' }}>
                          {name}
                        </Text>
                        <View style={{ alignSelf: 'flex-start', marginTop: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, backgroundColor: 'rgba(0,0,0,0.25)' }}>
                          <Text className="text-[11px]" weight="black" style={{ color: '#ffffff' }}>
                            {state.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={{ padding: 16, gap: 12 }}>
                    <Text className="text-sm leading-5 text-muted">{game.description || meta.subtitle}</Text>
                    <Button
                      label="Chơi một mình"
                      disabled={!playable}
                      icon={<Flame size={18} color={playable ? colors.canvas : colors.muted} />}
                      accessibilityLabel={`${name}: chơi một mình`}
                      onPress={() => openGame(type, 'SOLO')}
                    />
                    <Button
                      variant="secondary"
                      label="Chơi cùng bạn"
                      disabled={!playable}
                      icon={<Users size={18} color={playable ? colors.accentDeep : colors.muted} />}
                      accessibilityLabel={`${name}: chơi cùng bạn`}
                      onPress={() => openGame(type, 'MULTIPLAYER')}
                    />
                  </View>
                </View>
              </View>
            );
          })
        : null}

      {canFetch && active.isError ? (
        <Text className="mb-3 text-xs text-muted">Chưa kiểm tra được ván đang chơi. {active.error.message}</Text>
      ) : null}
      {canFetch && activeGame && !activeRoute ? (
        <Button className="mb-4" variant="secondary" label="Cập nhật trạng thái ván" onPress={() => void active.refetch()} />
      ) : null}
    </ScrollView>
  );
}
