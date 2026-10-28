import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Award, Delete, Heart, Lightbulb, Sparkles, Timer, Wifi, WifiOff } from 'lucide-react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { gameApi } from '@/src/features/games/api';
import { useGameSocket } from '@/src/features/games/use-game-socket';
import type { CurrentWord, GameEvent, LetterStatus } from '@/src/features/games/types';
import { dueAt } from '@/src/features/games/types';
import { createRequestId } from '@/src/lib/request-id';
import { colors } from '@/src/theme';

const keyRows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
function colorForStatus(status: LetterStatus) {
  if (status === 'CORRECT') return colors.success;
  if (status === 'PRESENT') return '#e6a321';
  return '#7d8799';
}

function StatusPill({ connected }: { connected: boolean }) {
  const Icon = connected ? Wifi : WifiOff;
  return (
    <View className="flex-row items-center gap-1.5 rounded-full px-3 py-2" style={{ backgroundColor: connected ? colors.successSoft : colors.surfaceTint }}>
      <Icon size={14} color={connected ? colors.success : colors.muted} />
      <Text weight="bold" className="text-xs" style={{ color: connected ? colors.success : colors.muted }}>
        {connected ? 'Đã kết nối' : 'Đang kết nối'}
      </Text>
    </View>
  );
}

function StatPill({ icon, value, label, tone }: { icon: React.ReactNode; value: string; label: string; tone: string }) {
  return (
    <View className="min-h-12 flex-1 flex-row items-center gap-2 rounded-2xl px-3" style={{ backgroundColor: colors.surface }}>
      <View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${tone}18` }}>{icon}</View>
      <View>
        <Text weight="black" className="text-sm">{value}</Text>
        <Text className="text-[10px] text-muted">{label}</Text>
      </View>
    </View>
  );
}

export default function WordlyMatchScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const [guess, setGuess] = useState('');
  const [busy, setBusy] = useState(false);
  const [hintBusy, setHintBusy] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState<number | null>(null);
  const pendingGuess = useRef<{ wordId: string; guess: string; requestId: string } | null>(null);
  const hintRequest = useRef<{ wordId: string; requestId: string } | null>(null);

  const match = useQuery({
    queryKey: ['games', 'match', matchId],
    queryFn: () => gameApi.getMatch(matchId),
    enabled: Boolean(matchId),
    refetchInterval: 15_000,
  });
  const current = useQuery({
    queryKey: ['games', 'current', matchId],
    queryFn: () => gameApi.current(matchId),
    enabled: Boolean(matchId),
    refetchInterval: (query) => query.state.data?.wordStatus === 'ACTIVE' ? 5_000 : false,
    retry: (count, cause) => count < 2 && !(cause instanceof Error && /403|404|not active/i.test(cause.message)),
  });
  const ranking = useQuery({
    queryKey: ['games', 'ranking', matchId],
    queryFn: () => gameApi.ranking(matchId),
    enabled: Boolean(matchId),
    refetchInterval: 10_000,
  });

  const onEvent = useCallback((event: GameEvent) => {
    if (event.match) qc.setQueryData(['games', 'match', matchId], event.match);
    if (event.ranking) qc.setQueryData(['games', 'ranking', matchId], event.ranking);
    if (event.type === 'MATCH_FINISHED') {
      router.replace({ pathname: '/games/results/[matchId]', params: { matchId, gameType: 'WORDLY' } } as never);
    }
    void qc.invalidateQueries({ queryKey: ['games', 'current', matchId] });
    void qc.invalidateQueries({ queryKey: ['games', 'match', matchId] });
    void qc.invalidateQueries({ queryKey: ['games', 'ranking', matchId] });
  }, [matchId, qc, router]);

  const connected = useGameSocket(match.data?.roomId ?? null, matchId, onEvent);
  const word = current.data;
  const myTurn = match.data?.playerMode === 'SOLO' || Boolean(match.data?.ownPlayer);

  useEffect(() => {
    if (!word?.deadlineAt || !word.timeEnabled) {
      setSeconds(null);
      return;
    }
    const tick = () => setSeconds(dueAt(word.deadlineAt, Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [word?.deadlineAt, word?.timeEnabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void current.refetch();
        void match.refetch();
        void ranking.refetch();
      }
    });
    return () => subscription.remove();
  }, [current.refetch, match.refetch, ranking.refetch]);

  useEffect(() => {
    if (match.data?.status === 'COMPLETED') {
      router.replace({ pathname: '/games/results/[matchId]', params: { matchId, gameType: 'WORDLY' } } as never);
    }
  }, [match.data?.status, matchId, router]);

  const submit = async () => {
    if (!word || busy || guess.length !== word.columns) return;
    setBusy(true);
    setError('');
    const normalizedGuess = guess.toUpperCase();
    if (pendingGuess.current?.wordId !== word.playerWordId || pendingGuess.current.guess !== normalizedGuess) {
      pendingGuess.current = { wordId: word.playerWordId, guess: normalizedGuess, requestId: createRequestId() };
    }
    try {
      const result = await gameApi.guess(matchId, {
        requestId: pendingGuess.current.requestId,
        playerWordId: word.playerWordId,
        guess: normalizedGuess,
      });
      if ('code' in result && result.code === 'REQUEST_PENDING') {
        setError('Đang xử lý lượt đoán. Trạng thái sẽ tự đồng bộ ngay sau đó.');
      } else {
        const accepted = result as import('@/src/features/games/types').GuessResponse;
        pendingGuess.current = null;
        if (accepted.nextWord) qc.setQueryData(['games', 'current', matchId], accepted.nextWord);
        else void qc.invalidateQueries({ queryKey: ['games', 'current', matchId] });
        if (accepted.matchFinished) {
          router.replace({ pathname: '/games/results/[matchId]', params: { matchId, gameType: 'WORDLY' } } as never);
          return;
        }
        setGuess('');
      }
      void qc.invalidateQueries({ queryKey: ['games', 'match', matchId] });
      void qc.invalidateQueries({ queryKey: ['games', 'ranking', matchId] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không gửi được lượt đoán.');
    } finally {
      setBusy(false);
    }
  };

  const useHint = async () => {
    if (!word || hintBusy || word.hint?.hintUsed) return;
    if (hintRequest.current?.wordId !== word.playerWordId) {
      hintRequest.current = { wordId: word.playerWordId, requestId: createRequestId() };
    }
    setHintBusy(true);
    setError('');
    try {
      const hint = await gameApi.hint(matchId, word.playerWordId, hintRequest.current.requestId);
      hintRequest.current = null;
      qc.setQueryData<CurrentWord>(['games', 'current', matchId], (previous) => previous ? { ...previous, hint } : previous);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được gợi ý.');
    } finally {
      setHintBusy(false);
    }
  };

  const guessedRows = useMemo(() => word?.guesses ?? [], [word]);
  const tileSize = word ? Math.max(26, Math.min(56, Math.floor((width - 40 - (word.columns - 1) * 6) / word.columns))) : 48;
  const progress = word?.wordLimit ? Math.min(1, word.wordNumber / word.wordLimit) : 0;
  const timerColor = seconds !== null && seconds <= 5 ? colors.danger : colors.accentDeep;

  if (match.isPending || current.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-6">
        <View className="h-16 w-16 items-center justify-center rounded-3xl" style={{ backgroundColor: colors.accentSoft }}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
        <Text weight="bold" className="mt-4 text-base">Đang vào ván Wordly</Text>
        <Text className="mt-1 text-center text-sm text-muted">Đang đồng bộ câu hỏi và trạng thái của bạn…</Text>
      </View>
    );
  }

  if (match.isError || !match.data) {
    return (
      <View className="flex-1 justify-center bg-canvas px-5">
        <View className="rounded-3xl border border-line bg-surface p-6">
          <Text weight="black" className="text-xl">Chưa tải được ván chơi</Text>
          <Text className="mt-2 text-sm leading-6 text-muted">Kiểm tra kết nối rồi đồng bộ lại ván Wordly của bạn.</Text>
          <Button className="mt-5" label="Thử tải lại" onPress={() => { void match.refetch(); void current.refetch(); }} />
        </View>
      </View>
    );
  }

  if (current.isError && !word) {
    return (
      <View className="flex-1 justify-center bg-canvas px-5">
        <View className="rounded-3xl border border-line bg-surface p-6">
          <Text weight="black" className="text-xl">Chưa có lượt chơi hiện tại</Text>
          <Text className="mt-2 text-sm leading-6 text-muted">Có thể bạn chưa được xếp lượt trong ván nhiều người. Hãy đồng bộ lại sau ít giây.</Text>
          <Button className="mt-5" label="Đồng bộ lại" onPress={() => void current.refetch()} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-10 pt-3">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Quay lại" className="h-11 w-11 items-center justify-center rounded-2xl border border-line bg-surface">
            <ArrowLeft size={20} color={colors.ink} />
          </Pressable>
          <View className="flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: connected ? colors.success : colors.accentWarm }} />
            <StatusPill connected={connected} />
          </View>
        </View>

        {word ? <>
          <View className="mt-5 overflow-hidden rounded-3xl p-5" style={{ backgroundColor: colors.heroStart }}>
            <View className="absolute -right-8 -top-12 h-36 w-36 rounded-full" style={{ backgroundColor: colors.heroEnd, opacity: 0.55 }} />
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-2">
                  <View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
                    <Sparkles size={16} color="#fff" />
                  </View>
                  <Text weight="bold" className="text-xs uppercase tracking-widest text-blue-100">Wordly · Từ {word.wordNumber}{word.wordLimit ? ` / ${word.wordLimit}` : ''}</Text>
                </View>
                <Text weight="black" className="mt-3 text-2xl text-white">Đoán từ bí mật</Text>
                <Text className="mt-1 text-xs leading-5 text-blue-100">Đọc nghĩa, điền chữ và tìm từ tiếng Anh chính xác.</Text>
              </View>
              <View className="items-center rounded-2xl px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                <Heart size={17} color="#ff9c9c" fill="#ff9c9c" />
                <Text weight="black" className="mt-1 text-lg text-white">{word.player.livesRemaining}</Text>
                <Text className="text-[10px] text-blue-100">mạng</Text>
              </View>
            </View>
            {word.wordLimit ? <View className="mt-5">
              <View className="mb-2 flex-row justify-between"><Text className="text-[10px] text-blue-100">TIẾN ĐỘ VÁN</Text><Text weight="bold" className="text-[10px] text-white">{word.wordNumber}/{word.wordLimit}</Text></View>
              <View className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <View className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: '#ffc66d' }} />
              </View>
            </View> : null}
          </View>

          <View className="mt-3 flex-row gap-2">
            <StatPill icon={<Award size={16} color={colors.accent} />} value={`${word.player.totalScore}`} label="Điểm hiện tại" tone={colors.accent} />
            <StatPill icon={<Sparkles size={16} color={colors.accentWarm} />} value={`${word.player.currentStreak}`} label="Chuỗi liên tiếp" tone={colors.accentWarm} />
            <StatPill icon={<Timer size={16} color={timerColor} />} value={seconds === null ? `${word.attemptsUsed}/${word.maxAttempts}` : `${seconds}s`} label={seconds === null ? 'Lượt đoán' : 'Thời gian'} tone={timerColor} />
          </View>

          <View className="mt-4 rounded-3xl border border-line bg-surface p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: colors.warmSoft }}>
                  <Lightbulb size={17} color={colors.accentWarm} />
                </View>
                <Text weight="bold" className="text-xs uppercase tracking-wider text-muted">Nghĩa của từ</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={word.hint?.hintUsed ? 'Đã dùng gợi ý' : 'Dùng gợi ý'}
                accessibilityState={{ disabled: hintBusy || Boolean(word.hint?.hintUsed) }}
                disabled={hintBusy || Boolean(word.hint?.hintUsed)}
                onPress={() => void useHint()}
                className="min-h-11 flex-row items-center gap-1.5 rounded-xl px-3"
                style={{ backgroundColor: word.hint?.hintUsed ? colors.surfaceTint : colors.accentSoft }}
              >
                <Lightbulb size={15} color={word.hint?.hintUsed ? colors.muted : colors.accent} />
                <Text weight="bold" className="text-xs" style={{ color: word.hint?.hintUsed ? colors.muted : colors.accent }}>
                  {hintBusy ? 'Đang lấy…' : word.hint?.hintUsed ? 'Đã dùng' : 'Gợi ý'}
                </Text>
              </Pressable>
            </View>
            <Text weight="bold" className="mt-3 text-lg leading-7">{word.meaning}</Text>
          </View>

          <View className="mt-4 rounded-3xl border border-line bg-surface px-3 py-4">
            <View className="mb-3 flex-row items-center justify-between px-1">
              <Text weight="bold" className="text-sm">Bảng chữ cái</Text>
              <Text className="text-xs text-muted">{word.columns} chữ cái</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
              <View className="items-center gap-1.5">
                {Array.from({ length: word.maxAttempts }, (_, row) => {
                  const past = guessedRows[row];
                  const activeRow = row === guessedRows.length;
                  return (
                    <View key={row} className="flex-row justify-center gap-1.5">
                      {Array.from({ length: word.columns }, (_, column) => {
                        const letter = past?.guess[column] ?? (activeRow ? guess[column] : '');
                        const status = past?.letters[column];
                        const hinted = word.hint?.revealedCell.column === column;
                        const statusColor = status ? colorForStatus(status) : undefined;
                        const background = statusColor ?? (hinted ? colors.accentSoft : colors.canvas);
                        const border = statusColor ?? (hinted ? colors.accent : letter ? colors.accentWarm : colors.line);
                        return (
                          <View key={column} className="items-center justify-center rounded-xl border-2" style={{ width: tileSize, height: tileSize, backgroundColor: background, borderColor: border }}>
                            <Text weight="black" className="text-xl" style={{ color: status ? '#fff' : colors.ink }}>
                              {letter || (hinted ? word.hint?.revealedCell.letter : '')}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <View className="mt-4 gap-2">
              {keyRows.map((row, rowIndex) => (
                <View key={row} className="flex-row justify-center gap-1.5" style={{ paddingHorizontal: rowIndex === 1 ? 10 : 0 }}>
                  {[...row].map((letter) => {
                    const status = word.keyboard[letter];
                    const disabled = !myTurn || busy || status === 'ABSENT' || word.wordStatus !== 'ACTIVE';
                    return (
                      <Pressable
                        key={letter}
                        accessibilityRole="button"
                        accessibilityLabel={`Chữ ${letter}`}
                        accessibilityState={{ disabled }}
                        disabled={disabled}
                        onPress={() => setGuess((previous) => previous.length < word.columns ? previous + letter : previous)}
                        className="h-11 min-w-0 flex-1 items-center justify-center rounded-xl"
                        style={{ backgroundColor: status ? colorForStatus(status) : colors.surfaceTint, opacity: disabled && !status ? 0.52 : 1 }}
                      >
                        <Text weight="bold" className="text-xs" style={{ color: status ? '#fff' : colors.ink }}>{letter}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
              <View className="mt-1 flex-row gap-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Xóa chữ cuối"
                  disabled={!guess || busy}
                  onPress={() => setGuess((previous) => previous.slice(0, -1))}
                  className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-line bg-canvas"
                >
                  <Delete size={17} color={colors.ink} />
                  <Text weight="bold" className="text-xs">Xóa</Text>
                </Pressable>
                <Button
                  className="flex-[2]"
                  label={busy ? 'Đang kiểm tra…' : 'Kiểm tra từ'}
                  loading={busy}
                  disabled={guess.length !== word.columns || !myTurn || word.wordStatus !== 'ACTIVE'}
                  onPress={() => void submit()}
                />
              </View>
            </View>
          </View>

          {error ? <View className="mt-3 rounded-2xl border px-4 py-3" style={{ backgroundColor: colors.dangerSoft, borderColor: colors.danger }}>
            <Text accessibilityRole="alert" className="text-sm leading-5" style={{ color: colors.danger }}>{error}</Text>
          </View> : null}
          {!myTurn ? <View className="mt-3 rounded-2xl px-4 py-3" style={{ backgroundColor: colors.accentSoft }}>
            <Text className="text-center text-sm" style={{ color: colors.accentDeep }}>Đang chờ đến lượt của bạn.</Text>
          </View> : null}

          {ranking.data?.players.length ? <View className="mt-4 rounded-3xl border border-line bg-surface p-4">
            <View className="mb-1 flex-row items-center gap-2"><Award size={18} color={colors.accentWarm} /><Text weight="black" className="text-base">Bảng xếp hạng</Text></View>
            {ranking.data.players.map((player, index) => (
              <View key={player.userId} className="mt-3 flex-row items-center rounded-2xl px-3 py-2.5" style={{ backgroundColor: index === 0 ? colors.warmSoft : colors.canvas }}>
                <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: index === 0 ? colors.accentWarm : colors.surfaceTint }}>
                  <Text weight="black" className="text-xs" style={{ color: index === 0 ? '#fff' : colors.muted }}>#{player.rank}</Text>
                </View>
                <Text weight="semibold" className="ml-3 flex-1 text-sm">{player.displayName ?? 'Người chơi'}</Text>
                <Text weight="black" className="text-sm text-accent">{player.totalScore} điểm</Text>
              </View>
            ))}
          </View> : null}
        </> : null}
      </ScrollView>
    </View>
  );
}
