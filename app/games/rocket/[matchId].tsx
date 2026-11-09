import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Clock3, Rocket, WifiOff, XCircle } from 'lucide-react-native';

import { ConfettiBurst } from '@/src/components/effects/confetti-burst';
import { DamageFlash } from '@/src/components/effects/damage-flash';
import { RewardToast } from '@/src/components/effects/reward-toast';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { PRACTICE_HOME, resultRoute } from '@/src/features/games/game-meta';
import { RocketArena } from '@/src/features/games/rocket/rocket-arena';
import { useRocketMatch } from '@/src/features/games/rocket/use-rocket-match';
import { GameHud, GameStateScreen, Hearts, ProgressBar, StandingsStrip, TimerPill } from '@/src/features/games/ui/game-ui';
import { colors } from '@/src/theme';

export default function RocketMatchScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useCurrentUser();
  const game = useRocketMatch(matchId);
  const { match, current, round, result } = game;

  if (match.isPending || current.isPending) {
    return <GameStateScreen loading title="Đang đồng bộ Rocket…" message="Đang chuẩn bị đường chạy cho bạn" />;
  }
  if (match.isError || !match.data) {
    return (
      <GameStateScreen
        icon={WifiOff}
        title="Không tải được ván Rocket"
        message={match.error?.message}
        actions={[
          { label: 'Thử lại', onPress: () => void match.refetch() },
          { label: 'Về trò chơi', variant: 'secondary', onPress: () => router.replace(PRACTICE_HOME) },
        ]}
      />
    );
  }

  const settings = current.data?.settings;
  const alive = round?.player.status === 'ACTIVE';
  const score = round?.player.totalScore ?? result?.totalScore ?? 0;
  const lives = round?.player.livesRemaining ?? result?.livesRemaining ?? 0;
  const total = round?.total ?? settings?.questionCount ?? 0;
  const roundResultForThis = round && result?.roundId === round.roundId ? result : null;
  // A result that is not for the visible round is the previous round's, shown as a banner.
  const previousResult = result && (!round || game.awaitingOpen) ? result : null;
  const timerTotal = settings?.secondsPerQuestion ?? null;

  return (
    <View className="flex-1 bg-canvas">
      <GameHud
        kind="ROCKET"
        score={score}
        leaving={game.leaving}
        onExit={game.confirmLeave}
        right={!game.connected ? <WifiOff size={16} color={colors.muted} /> : null}
      />
      {game.multiplayer && game.ranking.data ? <StandingsStrip players={game.ranking.data.players} meId={user.data?.id} /> : null}

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text weight="bold" className="mb-1 text-xs text-muted">
              Vòng {round?.number ?? 0}/{total}
            </Text>
            <ProgressBar ratio={total ? (round?.number ?? 0) / total : 0} color={colors.accentWarm} />
          </View>
          <Hearts remaining={lives} total={settings?.initialLives ?? lives} />
          {round && !game.awaitingOpen && round.deadlineAt ? <TimerPill seconds={game.secondsLeft} /> : null}
        </View>

        <RocketArena
          roundId={round?.roundId ?? null}
          roundNumber={round?.number ?? 1}
          opensAt={round?.opensAt ?? null}
          deadlineAt={round?.deadlineAt ?? null}
          serverOffsetMs={game.serverOffset}
          outcome={result ? { roundId: result.roundId, correct: result.correct } : null}
        />
        {round?.deadlineAt && timerTotal ? (
          <ProgressBar ratio={game.secondsLeft / timerTotal} color={game.secondsLeft <= 5 ? colors.danger : colors.accent} height={4} />
        ) : null}

        {previousResult ? (
          <View
            accessibilityLiveRegion="polite"
            className="flex-row items-center justify-center gap-2 rounded-2xl p-3"
            style={{ backgroundColor: previousResult.correct ? colors.successSoft : colors.dangerSoft }}
          >
            {previousResult.correct ? <CheckCircle2 size={19} color={colors.success} /> : <XCircle size={19} color={colors.danger} />}
            <Text weight="bold" className="text-sm">
              {previousResult.correct ? `Chính xác! +${previousResult.points} điểm` : 'Chưa chính xác, câu sau cố lên nhé.'}
            </Text>
          </View>
        ) : null}

        {round ? (
          <>
            <View className="rounded-3xl border border-line bg-surface p-4" style={{ borderBottomWidth: 4, borderBottomColor: colors.edge }}>
              <Text weight="bold" className="text-center text-[11px] uppercase tracking-widest text-muted">
                Chọn từ đúng nghĩa
              </Text>
              <Text weight="black" className="mt-2 text-center text-2xl leading-8">
                {round.meaning}
              </Text>
            </View>

            {game.awaitingOpen ? (
              <View className="items-center rounded-3xl p-6" style={{ backgroundColor: colors.accentSoft }}>
                <Clock3 size={26} color={colors.accent} />
                <Text weight="bold" className="mt-2 text-sm text-accent">
                  Vòng mới mở sau {game.secondsLeft} giây
                </Text>
              </View>
            ) : (
              <View className="gap-2.5">
                {round.options.map((option, index) => {
                  const chosen = game.selectedOption === option.optionId || round.me.optionId === option.optionId;
                  const correct = roundResultForThis?.correctOptionId === option.optionId;
                  const wrong = roundResultForThis?.chosenOptionId === option.optionId && !roundResultForThis.correct;
                  const disabled =
                    game.busy || round.me.answered || !alive || Boolean(game.pendingForRound && game.pendingForRound.optionId !== option.optionId);
                  const tint = correct ? colors.success : wrong ? colors.danger : chosen ? colors.accent : colors.line;
                  return (
                    <Pressable
                      key={option.optionId}
                      disabled={disabled}
                      onPress={() => void game.answer(option.optionId)}
                      accessibilityRole="button"
                      accessibilityLabel={`${String.fromCharCode(65 + index)}. ${option.word}`}
                      accessibilityState={{ disabled, selected: chosen }}
                      className="min-h-[60px] flex-row items-center rounded-2xl border-2 px-4 active:translate-y-0.5"
                      style={{
                        borderColor: tint,
                        borderBottomWidth: 4,
                        backgroundColor: correct ? colors.successSoft : wrong ? colors.dangerSoft : chosen ? colors.accentSoft : colors.surface,
                        opacity: disabled && !chosen && !correct ? 0.6 : 1,
                      }}
                    >
                      <View
                        className="mr-3 h-8 w-8 items-center justify-center rounded-xl"
                        style={{ backgroundColor: correct || wrong || chosen ? tint : colors.surfaceTint }}
                      >
                        <Text weight="black" className="text-xs" style={{ color: correct || wrong || chosen ? colors.onAccent : colors.accent }}>
                          {String.fromCharCode(65 + index)}
                        </Text>
                      </View>
                      <Text weight="bold" className="flex-1 text-lg">
                        {option.word}
                      </Text>
                      {correct ? <CheckCircle2 size={20} color={colors.success} /> : wrong ? <XCircle size={20} color={colors.danger} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            )}
            {round.me.answered && !game.busy && !roundResultForThis ? (
              <Text className="text-center text-sm text-muted">Đã chọn đáp án. Đang chờ kết quả…</Text>
            ) : null}
            {!alive ? <Text className="text-center text-sm text-danger">Bạn đã hết mạng. Đang chờ ván kết thúc.</Text> : null}
          </>
        ) : current.data?.matchFinished ? (
          <View className="items-center rounded-3xl p-6" style={{ backgroundColor: colors.successSoft }}>
            <CheckCircle2 size={30} color={colors.success} />
            <Text weight="black" className="mt-3 text-xl">Ván đã hoàn tất</Text>
            <Button className="mt-4 self-stretch" label="Xem kết quả" onPress={() => router.replace(resultRoute(matchId, 'ROCKET'))} />
          </View>
        ) : current.isError ? (
          <View className="rounded-3xl border border-line bg-surface p-5">
            <Text weight="bold">Chưa tải được câu hiện tại</Text>
            <Text className="mt-2 text-sm text-muted">{current.error.message}</Text>
            <Button className="mt-4" label="Đồng bộ lại" onPress={() => void current.refetch()} />
          </View>
        ) : (
          <View className="items-center rounded-3xl border border-line bg-surface p-6">
            <Rocket size={24} color={colors.accentWarm} />
            <Text className="mt-2 text-sm text-muted">Đang chờ vòng tiếp theo…</Text>
          </View>
        )}

        {game.error ? (
          <Text accessibilityRole="alert" className="rounded-xl p-3 text-sm text-danger" style={{ backgroundColor: colors.dangerSoft }}>
            {game.error}
          </Text>
        ) : null}
      </ScrollView>

      <ConfettiBurst trigger={game.burst.n} size={game.burst.large ? 'large' : 'small'} originY={0.3} />
      <DamageFlash trigger={game.damage} />
      <RewardToast reward={game.reward} onDone={game.clearReward} top={60} />
    </View>
  );
}
