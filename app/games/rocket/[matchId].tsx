import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Clock3, Flame, Rocket, Wifi, WifiOff, XCircle } from 'lucide-react-native';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { gameApi } from '@/src/features/games/api';
import { useGameSocket } from '@/src/features/games/use-game-socket';
import type { GameEvent } from '@/src/features/games/types';
import { createRequestId } from '@/src/lib/request-id';
import { colors } from '@/src/theme';

const resultRoute = (matchId: string) => ({ pathname: '/games/results/[matchId]', params: { matchId, gameType: 'ROCKET' } }) as never;

export default function RocketMatchScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter(); const qc = useQueryClient();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState(''); const [secondsLeft, setSecondsLeft] = useState(0);
  const pendingAnswer = useRef<{ roundId: string; optionId: string; requestId: string } | null>(null);
  const match = useQuery({ queryKey: ['games', 'match', matchId], queryFn: () => gameApi.getMatch(matchId), enabled: Boolean(matchId), refetchInterval: 5000, retry: 1 });
  const current = useQuery({ queryKey: ['games', 'rocket-current', matchId], queryFn: ({ signal }) => gameApi.rocketCurrent(matchId, signal), enabled: Boolean(matchId), refetchInterval: (query) => query.state.data?.matchFinished ? false : 5000, retry: 2 });
  const ranking = useQuery({ queryKey: ['games', 'ranking', matchId], queryFn: () => gameApi.ranking(matchId), enabled: Boolean(matchId), refetchInterval: 10_000, retry: 1 });
  const onEvent = useCallback((event: GameEvent) => {
    if (event.match) qc.setQueryData(['games', 'match', matchId], event.match);
    if (event.ranking) qc.setQueryData(['games', 'ranking', matchId], event.ranking);
    if (event.type === 'MATCH_FINISHED') router.replace(resultRoute(matchId));
    if (event.type === 'ROOM_CLOSED' || event.type === 'PLAYER_KICKED') setError(event.message ?? 'Phòng chơi đã kết thúc.');
    void qc.invalidateQueries({ queryKey: ['games', 'rocket-current', matchId] });
    void qc.invalidateQueries({ queryKey: ['games', 'match', matchId] });
    void qc.invalidateQueries({ queryKey: ['games', 'ranking', matchId] });
  }, [matchId, qc, router]);
  const connected = useGameSocket(match.data?.roomId ?? null, matchId, onEvent);
  const round = current.data?.round;
  const offset = current.data ? Date.parse(current.data.serverTime) - Date.now() : 0;
  const rankingOffset = ranking.data ? Date.parse(ranking.data.serverTime) - Date.now() : 0;
  const awaitingOpen = Boolean(round && !round.deadlineAt && Date.parse(round.opensAt) > Date.now() + offset);
  const result = current.data?.lastRoundResult;

  useEffect(() => {
    if (!round) return;
    const target = round.deadlineAt ?? round.opensAt;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((Date.parse(target) - (Date.now() + offset)) / 1000)));
    tick(); const timer = setInterval(tick, 500); return () => clearInterval(timer);
  }, [round?.roundId, round?.deadlineAt, round?.opensAt, offset]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') { void current.refetch(); void match.refetch(); void ranking.refetch(); }
    });
    return () => subscription.remove();
  }, [current.refetch, match.refetch, ranking.refetch]);
  useEffect(() => { setSelectedOption(round?.me.answered ? round.me.optionId : null); }, [round?.roundId, round?.me.answered, round?.me.optionId]);
  useEffect(() => { if (current.data?.matchFinished) router.replace(resultRoute(matchId)); }, [current.data?.matchFinished, matchId, router]);

  const answer = async (optionId: string) => {
    if (!round || round.me.answered || awaitingOpen || busy) return;
    let pending = pendingAnswer.current;
    if (!pending || pending.roundId !== round.roundId || pending.optionId !== optionId) {
      pending = { roundId: round.roundId, optionId, requestId: createRequestId() };
      pendingAnswer.current = pending;
    }
    setSelectedOption(optionId); setBusy(true); setError('');
    try {
      const ack = await gameApi.rocketAnswer(matchId, round.roundId, pending.requestId, optionId);
      pendingAnswer.current = null;
      if (ack.roundResult?.matchFinished) { router.replace(resultRoute(matchId)); return; }
      await current.refetch();
      void ranking.refetch();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không gửi được câu trả lời. Hãy chọn lại để thử lại.');
      void current.refetch();
    } finally { setBusy(false); }
  };
  const leave = async () => {
    if (leaving) return;
    setLeaving(true); setError('');
    try {
      const response = await gameApi.leaveMatch(matchId);
      await qc.invalidateQueries({ queryKey: ['games', 'active'] });
      if (response.resultAvailable) router.replace(resultRoute(matchId));
      else router.replace('/games' as never);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể rời ván chơi.'); }
    finally { setLeaving(false); }
  };
  const askLeave = () => Alert.alert('Rời ván Rocket?', 'Bạn sẽ giữ điểm đã có nhưng rời khỏi lượt chơi.', [{ text: 'Ở lại', style: 'cancel' }, { text: 'Rời ván', style: 'destructive', onPress: () => void leave() }]);

  if (match.isPending || current.isPending) return <View className="flex-1 items-center justify-center bg-canvas"><Rocket size={26} color={colors.accentWarm}/><Text className="mt-3 text-sm text-muted">Đang đồng bộ Rocket…</Text></View>;
  if (match.isError || !match.data) return <View className="flex-1 justify-center bg-canvas px-5"><Text weight="bold">Không tải được ván Rocket.</Text><Text className="mt-2 text-sm text-muted">{match.error?.message}</Text><Button className="mt-4" label="Thử lại" onPress={() => void match.refetch()}/><Button className="mt-3" variant="secondary" label="Về trò chơi" onPress={() => router.replace('/games' as never)}/></View>;

  const resultForPreviousRound = result && (!round || awaitingOpen) ? result : null;
  const alive = round?.player.status === 'ACTIVE';
  const totalScore = round?.player.totalScore ?? result?.totalScore ?? 0;
  const lives = round?.player.livesRemaining ?? result?.livesRemaining ?? 0;
  return <View className="flex-1 bg-canvas"><ScrollView contentContainerClassName="px-5 pb-10 pt-3">
    <View className="flex-row items-center justify-between"><Pressable onPress={askLeave} className="h-11 w-11 items-center justify-center rounded-full bg-surface" accessibilityLabel="Rời ván"><ArrowLeft size={20} color={colors.ink}/></Pressable><View className="flex-row items-center gap-2">{connected ? <Wifi size={16} color={colors.success}/> : <WifiOff size={16} color={colors.muted}/>}<Text className="text-xs text-muted">{connected ? 'Đang đồng bộ' : 'Đang kết nối lại'}</Text></View></View>
    <View className="mt-5 overflow-hidden rounded-3xl p-5" style={{ backgroundColor: colors.heroStart }}><View className="absolute -right-5 -top-7 h-32 w-32 rounded-full" style={{ backgroundColor: colors.heroEnd, opacity: 0.7 }}/><View className="flex-row items-center"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/15"><Rocket size={22} color={colors.accentWarm}/></View><View className="ml-3 flex-1"><Text weight="bold" className="text-xs uppercase tracking-widest text-white/75">ROCKET · {round ? `VÒNG ${round.number}/${round.total}` : 'ĐANG CHƠI'}</Text><Text weight="black" className="mt-1 text-2xl text-white">Chọn từ đúng</Text></View><View className="items-end"><Text weight="black" className="text-lg text-white">{totalScore}</Text><Text className="text-[10px] text-white/75">điểm</Text></View></View></View>
    <View className="mt-4 flex-row gap-3"><View className="flex-1 flex-row items-center gap-2 rounded-2xl border border-line bg-surface p-3"><Flame size={18} color={colors.accentWarm} fill={colors.accentWarm}/><View><Text weight="bold" className="text-sm">{lives} mạng</Text><Text className="text-[10px] text-muted">còn lại</Text></View></View><View className="flex-1 flex-row items-center gap-2 rounded-2xl border border-line bg-surface p-3"><Clock3 size={18} color={colors.accent}/><View><Text weight="bold" className="text-sm">{awaitingOpen ? `${secondsLeft}s` : round?.deadlineAt ? `${secondsLeft}s` : 'Sẵn sàng'}</Text><Text className="text-[10px] text-muted">{awaitingOpen ? 'vòng mở sau' : 'thời gian'}</Text></View></View></View>

    {resultForPreviousRound ? <Card className="mt-4 border-0 p-4" style={{ backgroundColor: resultForPreviousRound.correct ? colors.successSoft : colors.dangerSoft }}><View className="flex-row items-center gap-2">{resultForPreviousRound.correct ? <CheckCircle2 size={20} color={colors.success}/> : <XCircle size={20} color={colors.danger}/>}<Text weight="bold" className="flex-1">{resultForPreviousRound.correct ? `Chính xác! +${resultForPreviousRound.points} điểm` : 'Chưa chính xác, thử tiếp ở câu sau nhé.'}</Text></View></Card> : null}

    {current.isError && !round ? <Card className="mt-5 border-b-0 bg-surface p-5"><Text weight="bold">Chưa tải được câu hiện tại</Text><Text className="mt-2 text-sm text-muted">{current.error.message}</Text><Button className="mt-4" label="Đồng bộ lại" onPress={() => void current.refetch()}/></Card> : null}
    {round ? <Card className="mt-5 border-b-0 bg-surface p-5"><Text className="text-center text-xs uppercase tracking-widest text-muted">Chọn từ có nghĩa như sau</Text><Text weight="black" className="mt-3 text-center text-xl leading-8">{round.meaning}</Text>
      {awaitingOpen ? <View className="mt-5 items-center rounded-2xl p-5" style={{ backgroundColor: colors.accentSoft }}><Clock3 size={24} color={colors.accent}/><Text weight="bold" className="mt-2 text-sm text-accent">Vòng mới mở sau {secondsLeft} giây</Text></View> : <View className="mt-5 gap-3">{round.options.map((option, index) => {
        const chosen = selectedOption === option.optionId || round.me.optionId === option.optionId;
        return <Pressable key={option.optionId} disabled={busy || round.me.answered || !alive} onPress={() => void answer(option.optionId)} accessibilityRole="button" accessibilityState={{ disabled: busy || round.me.answered || !alive, selected: chosen }} className="min-h-[58px] flex-row items-center rounded-2xl border px-4" style={{ backgroundColor: chosen ? colors.accentSoft : colors.surface, borderColor: chosen ? colors.accent : colors.line, opacity: busy && !chosen ? 0.65 : 1 }}><View className="mr-3 h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: chosen ? colors.accent : colors.surfaceTint }}><Text weight="bold" className="text-xs" style={{ color: chosen ? 'white' : colors.accent }}>{String.fromCharCode(65 + index)}</Text></View><Text weight="bold" className="flex-1 text-base">{option.word}</Text>{chosen && round.me.answered ? <CheckCircle2 size={19} color={colors.accent}/> : null}{busy && chosen ? <ActivityIndicator color={colors.accent}/> : null}</Pressable>;
      })}</View>}
      {round.me.answered && !busy ? <Text className="mt-3 text-center text-sm text-muted">Bạn đã chọn đáp án. Đợi các người chơi khác…</Text> : null}
      {!alive ? <Text className="mt-3 text-center text-sm text-danger">Bạn đã hết mạng. Đang chờ ván kết thúc.</Text> : null}
    </Card> : current.data?.matchFinished ? <Card className="mt-5 items-center border-0 p-6" style={{ backgroundColor: colors.successSoft }}><CheckCircle2 size={28} color={colors.success}/><Text weight="black" className="mt-3 text-xl">Ván đã hoàn tất</Text><Button className="mt-4" label="Xem kết quả" onPress={() => router.replace(resultRoute(matchId))}/></Card> : <Card className="mt-5 items-center border-b-0 bg-surface p-5"><ActivityIndicator color={colors.accent}/><Text className="mt-3 text-sm text-muted">Đang chờ vòng tiếp theo…</Text></Card>}
    {error ? <Text accessibilityRole="alert" className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</Text> : null}
    <Card className="mt-5 border-b-0 bg-surface p-4"><View className="mb-1 flex-row items-center justify-between"><Text weight="bold">Bảng xếp hạng</Text><Text className="text-xs text-muted">{ranking.data?.isFinal ? 'Kết quả cuối' : 'Đang cập nhật'}</Text></View>{ranking.data?.players.map((player) => { const graceSeconds = player.status === 'DISCONNECTED' && player.reconnectDeadlineAt ? Math.max(0, Math.ceil((Date.parse(player.reconnectDeadlineAt) - (Date.now() + rankingOffset)) / 1000)) : null; return <View key={player.userId} className="mt-3 flex-row items-center justify-between"><View className="flex-1"><Text weight="bold" className="text-sm">#{player.rank} {player.displayName ?? 'Người chơi'}</Text><Text className="mt-0.5 text-xs text-muted">{graceSeconds !== null ? `Mất kết nối · quay lại trong ${graceSeconds}s` : `${player.wordsSolved} đúng · ${player.livesRemaining} mạng`}</Text></View><Text weight="black" className="text-sm text-accent">{player.totalScore}</Text></View>; })}{ranking.isError ? <Pressable onPress={() => void ranking.refetch()} className="mt-3 min-h-10 justify-center"><Text className="text-xs text-accent">Không tải được bảng điểm · Thử lại</Text></Pressable> : null}</Card>
    <Button className="mt-5" variant="secondary" label={leaving ? 'Đang rời ván…' : 'Rời ván'} loading={leaving} onPress={askLeave}/>
  </ScrollView></View>;
}
