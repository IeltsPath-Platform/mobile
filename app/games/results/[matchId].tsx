import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Award, Check, Heart, WifiOff, Zap, type LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfettiBurst } from '@/src/components/effects/confetti-burst';
import { CountUp } from '@/src/components/effects/count-up';
import { StarRating } from '@/src/components/effects/star-rating';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { StatCard } from '@/src/components/ui/stat-card';
import { getReview } from '@/src/features/games/review-log';
import { ReviewList } from '@/src/features/games/ui/review-list';
import { Text } from '@/src/components/ui/text';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { gameApi } from '@/src/features/games/api';
import { GAME_META, PRACTICE_HOME, gameTone, toGameKind } from '@/src/features/games/game-meta';
import type { GameResult } from '@/src/features/games/types';
import { GameStateScreen } from '@/src/features/games/ui/game-ui';
import { haptics } from '@/src/lib/haptics';
import { sound } from '@/src/lib/sound';
import { colors } from '@/src/theme';

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

  const heading = won ? 'Bạn về nhất!' : stars === 3 ? 'Xuất sắc!' : stars === 2 ? 'Làm tốt lắm!' : 'Hoàn thành ván!';
  const cards: { label: string; value: string; tone: 'accent' | 'success' | 'xp'; icon: LucideIcon }[] = rocketStats
    ? [
        { label: 'Câu đúng', value: `${rocketStats.correctCount}/${rocketStats.totalRounds}`, tone: 'success', icon: Check },
        { label: 'Mạng còn', value: `${rocketStats.livesRemaining}`, tone: 'accent', icon: Heart },
      ]
    : wordlyStats
      ? [
          { label: 'Từ giải được', value: `${wordlyStats.player.wordsSolved}/${wordlyStats.player.wordsProcessed}`, tone: 'success', icon: Check },
          { label: 'Chuỗi tốt nhất', value: `${wordlyStats.player.bestStreak}`, tone: 'accent', icon: Award },
        ]
      : [];

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: Math.max(insets.top, 16) + 8, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center' }}>
          <Animated.View entering={FadeInDown.springify().damping(12)} style={{ alignItems: 'center' }}>
            <Image source={require('@/assets/images/owl/hero-cheer.webp')} contentFit="contain" style={{ width: 170, height: 170 }} accessibilityIgnoresInvertColors />
          </Animated.View>
          <StarRating earned={stars} />
          <Text accessibilityRole="header" weight="black" className="mt-4 text-center text-3xl" style={{ color: colors.xp }}>
            {heading}
          </Text>
          <Text className="mt-1 text-sm text-muted">
            {name} · {minutes} phút
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
          <StatCard label="Điểm" value={String(score)} tone="xp" icon={Zap}>
            <CountUp value={score} weight="black" className="text-2xl" style={{ color: colors.xpDeep }} />
          </StatCard>
          {cards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} tone={card.tone} icon={card.icon} />
          ))}
        </View>

        <ReviewList items={getReview(matchId)} />

        {players && players.length > 1 ? (
          <Card className="mt-5 p-4">
            <Text weight="black" className="text-lg">Bảng xếp hạng</Text>
            <View className="mt-3 gap-2">
              {[...players].sort((a, b) => a.rank - b.rank).map((player) => {
                const mine = player.userId === user.data?.id;
                return (
                  <View
                    key={player.userId}
                    className="flex-row items-center rounded-2xl px-3 py-2.5"
                    style={{ backgroundColor: mine ? colors.accentSoft : colors.canvas, borderWidth: 2, borderColor: mine ? colors.accent : 'transparent' }}
                  >
                    <Text weight="black" className="w-8 text-base" style={{ color: player.rank === 1 ? colors.xpDeep : colors.muted }}>
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
          </Card>
        ) : null}
      </ScrollView>

      <View className="gap-3 border-t-2 border-line bg-canvas px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <Button label="Chơi lại" onPress={() => router.replace({ pathname: '/games', params: { gameType: kind } } as never)} />
        <Button label="Về luyện tập" variant="secondary" onPress={() => router.replace(PRACTICE_HOME)} />
      </View>
      <ConfettiBurst trigger={stars >= 2 || won ? 1 : 0} size="large" originY={0.22} />
    </View>
  );
}
