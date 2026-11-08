import { useEffect, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Award, Check, Heart, RotateCcw, WifiOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfettiBurst } from '@/src/components/effects/confetti-burst';
import { CountUp } from '@/src/components/effects/count-up';
import { StarRating } from '@/src/components/effects/star-rating';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { gameApi } from '@/src/features/games/api';
import { GAME_META, PRACTICE_HOME, gameTone, toGameKind } from '@/src/features/games/game-meta';
import type { GameResult } from '@/src/features/games/types';
import { GameStateScreen } from '@/src/features/games/ui/game-ui';
import { haptics } from '@/src/lib/haptics';
import { sound } from '@/src/lib/sound';
import { colors } from '@/src/theme';

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <View className="flex-1 items-center gap-1 rounded-2xl bg-canvas py-3">
      {icon}
      <Text weight="black" className="text-lg">{value}</Text>
      <Text className="text-center text-[11px] text-muted">{label}</Text>
    </View>
  );
}

export default function GameResultScreen() {
  const { matchId, gameType } = useLocalSearchParams<{ matchId: string; gameType?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useCurrentUser();
  const kind = toGameKind(gameType);
  const rocket = kind === 'ROCKET';
  const tone = gameTone(kind);

  const result = useQuery<GameResult>({
    queryKey: ['games', 'result', kind, matchId],
    queryFn: () => (rocket ? gameApi.rocketResult(matchId) : gameApi.result(matchId)),
    enabled: Boolean(matchId),
    retry: 1,
  });
  const ranking = useQuery({
    queryKey: ['games', 'ranking', matchId],
    queryFn: () => gameApi.ranking(matchId),
    enabled: Boolean(matchId) && rocket,
    retry: 1,
  });

  const loaded = Boolean(result.data);
  useEffect(() => {
    if (!loaded) return;
    haptics.success();
    void sound.play('complete');
  }, [loaded]);

  if (result.isPending) return <GameStateScreen loading title="Đang tổng kết ván chơi…" onBack={() => router.replace(PRACTICE_HOME)} />;
  if (!result.data) {
    return (
      <GameStateScreen
        icon={WifiOff}
        title="Chưa tải được kết quả"
        actions={[
          { label: 'Thử lại', onPress: () => void result.refetch() },
          { label: 'Về luyện tập', variant: 'secondary', onPress: () => router.replace(PRACTICE_HOME) },
        ]}
        onBack={() => router.replace(PRACTICE_HOME)}
      />
    );
  }

  const data = result.data;
  const rocketStats = rocket && 'correctCount' in data ? data : null;
  const wordlyStats = !rocket && 'player' in data ? data : null;
  const players = rocket ? ranking.data?.players : wordlyStats?.players;
  const score = rocketStats?.totalScore ?? wordlyStats?.player.totalScore ?? 0;
  const minutes = Math.max(1, Math.round(data.durationMs / 60_000));
  const me = players?.find((player) => player.userId === user.data?.id);
  const won = Boolean(me && me.rank === 1 && (players?.length ?? 0) > 1);
  const { name } = GAME_META[kind];
  // Cosmetic grade from accuracy; rewards themselves come from the server.
  const solved = rocketStats ? rocketStats.correctCount : (wordlyStats?.player.wordsSolved ?? 0);
  const attempted = rocketStats ? rocketStats.totalRounds : (wordlyStats?.player.wordsProcessed ?? 0);
  const accuracy = attempted ? solved / attempted : 0;
  const stars = accuracy >= 0.8 ? 3 : accuracy >= 0.5 ? 2 : 1;

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 8 }} showsVerticalScrollIndicator={false}>
        <View className="items-center rounded-[32px] px-6 pb-7 pt-9" style={{ backgroundColor: tone.soft }}>
          <StarRating earned={stars} />
          <Text accessibilityRole="header" weight="black" className="mt-4 text-center text-2xl">
            {won ? 'Bạn về nhất!' : stars === 3 ? 'Xuất sắc!' : stars === 2 ? 'Làm tốt lắm!' : 'Hoàn thành ván!'}
          </Text>
          <Text className="mt-1 text-sm text-muted">
            {name} · {minutes} phút
          </Text>
          <Animated.View entering={FadeInDown.delay(200).springify()} className="mt-5 items-center">
            <CountUp value={score} weight="black" className="text-6xl leading-[68px]" style={{ color: tone.solid }} />
            <Text weight="bold" className="text-sm text-muted">điểm</Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(320)} className="mt-3 flex-row gap-3">
          {rocketStats ? (
            <>
              <Stat icon={<Check size={20} color={colors.success} />} value={`${rocketStats.correctCount}/${rocketStats.totalRounds}`} label="Câu đúng" />
              <Stat icon={<Heart size={20} color={colors.danger} />} value={`${rocketStats.livesRemaining}`} label="Mạng còn" />
              <Stat icon={<RotateCcw size={20} color={colors.accent} />} value={`${rocketStats.answered}`} label="Đã trả lời" />
            </>
          ) : wordlyStats ? (
            <>
              <Stat icon={<Check size={20} color={colors.success} />} value={`${wordlyStats.player.wordsSolved}/${wordlyStats.player.wordsProcessed}`} label="Từ giải được" />
              <Stat icon={<Heart size={20} color={colors.danger} />} value={`${wordlyStats.player.livesRemaining}`} label="Mạng còn" />
              <Stat icon={<Award size={20} color={colors.accent} />} value={`${wordlyStats.player.bestStreak}`} label="Chuỗi tốt nhất" />
            </>
          ) : null}
        </Animated.View>

        {players && players.length > 1 ? (
          <Animated.View entering={FadeInDown.delay(440)} className="mt-3 rounded-3xl border border-line bg-surface p-4">
            <Text weight="black" className="text-base">Bảng xếp hạng</Text>
            <View className="mt-2 gap-2">
              {[...players].sort((a, b) => a.rank - b.rank).map((player) => {
                const mine = player.userId === user.data?.id;
                return (
                  <View
                    key={player.userId}
                    className="flex-row items-center rounded-2xl px-3 py-2.5"
                    style={{ backgroundColor: mine ? colors.accentSoft : colors.canvas }}
                  >
                    <Text weight="black" className="w-8 text-base" style={{ color: player.rank === 1 ? colors.xp : colors.muted }}>
                      {player.rank}
                    </Text>
                    <View className="flex-1">
                      <Text weight="bold" numberOfLines={1}>
                        {mine ? 'Bạn' : (player.displayName ?? 'Người chơi')}
                      </Text>
                      <Text className="text-xs text-muted">
                        {player.wordsSolved} {rocket ? 'câu đúng' : 'từ'} · {player.livesRemaining} mạng
                      </Text>
                    </View>
                    <Text weight="black" className="text-base" style={{ color: tone.solid }}>
                      {player.totalScore}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        <View className="mt-5 gap-3">
          <Button label="Chơi lại" onPress={() => router.replace({ pathname: '/games', params: { gameType: kind } } as never)} />
          <Button label="Về luyện tập" variant="secondary" onPress={() => router.replace(PRACTICE_HOME)} />
        </View>
      </ScrollView>
      <ConfettiBurst trigger={stars >= 2 || won ? 1 : 0} size="large" originY={0.22} />
    </View>
  );
}
