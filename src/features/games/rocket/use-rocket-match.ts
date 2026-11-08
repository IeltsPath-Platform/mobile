import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { Reward } from '@/src/components/effects/reward-toast';
import { haptics } from '@/src/lib/haptics';
import { createRequestId } from '@/src/lib/request-id';
import { sound } from '@/src/lib/sound';

import { gameApi } from '../api';
import { PRACTICE_HOME, resultRoute } from '../game-meta';
import { useCountdown } from '../use-countdown';
import { useGameSocket } from '../use-game-socket';
import type { GameEvent, GameRanking, RocketCurrent } from '../types';
import { mergeRanking } from '../types';

type PendingAnswer = { roundId: string; optionId: string; requestId: string };

/** All Rocket match state: server sync, answering and leaving. */
export function useRocketMatch(matchId: string) {
  const router = useRouter();
  const qc = useQueryClient();
  const connectedRef = useRef(false);
  const serverOffset = useRef(0);
  const pendingAnswer = useRef<PendingAnswer | null>(null);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [reward, setReward] = useState<Reward | null>(null);
  const [burst, setBurst] = useState({ n: 0, large: false });
  const [damage, setDamage] = useState(0);
  // Consecutive-correct counter is cosmetic; scoring stays on the server.
  const streak = useRef(0);

  const showResult = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['games', 'active'] });
    router.replace(resultRoute(matchId, 'ROCKET'));
  }, [matchId, qc, router]);

  const match = useQuery({
    queryKey: ['games', 'match', matchId],
    queryFn: () => gameApi.getMatch(matchId),
    enabled: Boolean(matchId),
    refetchInterval: () => (connectedRef.current ? 30_000 : 5_000),
    retry: 1,
  });

  const current = useQuery({
    queryKey: ['games', 'rocket-current', matchId],
    queryFn: ({ signal }) => gameApi.rocketCurrent(matchId, signal),
    enabled: Boolean(matchId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.matchFinished) return false;
      const round = data?.round;
      if (round && !round.deadlineAt) {
        // The server opens the round at opensAt; poll right around that moment.
        const untilOpen = Date.parse(round.opensAt) - (Date.now() + (Date.parse(data.serverTime) - Date.now()));
        return Math.max(1_000, Math.min(5_000, untilOpen + 250));
      }
      return connectedRef.current ? 10_000 : 5_000;
    },
    retry: 2,
  });

  const multiplayer = match.data?.playerMode === 'MULTIPLAYER';
  const ranking = useQuery({
    queryKey: ['games', 'ranking', matchId],
    queryFn: () => gameApi.ranking(matchId),
    enabled: Boolean(matchId) && multiplayer,
    refetchInterval: () => (connectedRef.current ? false : 10_000),
  });

  const onEvent = useCallback(
    (event: GameEvent) => {
      if (event.match) qc.setQueryData(['games', 'match', matchId], event.match);
      if (event.ranking) {
        const incoming = event.ranking;
        qc.setQueryData<GameRanking>(['games', 'ranking', matchId], (existing) => mergeRanking(existing ?? null, incoming));
      }
      if (event.type === 'MATCH_FINISHED') showResult();
      if (event.type === 'ROOM_CLOSED' || event.type === 'PLAYER_KICKED') setError(event.message ?? 'Phòng chơi đã kết thúc.');
      if (['ROCKET_ROUND_STARTED', 'ROCKET_ROUND_RESULT', 'MATCH_STATE', 'MATCH_STARTED'].includes(event.type)) {
        void qc.invalidateQueries({ queryKey: ['games', 'rocket-current', matchId] });
      }
      if (['MATCH_STATE', 'MATCH_STARTED'].includes(event.type) && !event.match) {
        void qc.invalidateQueries({ queryKey: ['games', 'match', matchId] });
      }
      if (event.type === 'RANKING_UPDATED' && !event.ranking) {
        void qc.invalidateQueries({ queryKey: ['games', 'ranking', matchId] });
      }
    },
    [matchId, qc, showResult],
  );
  const connected = useGameSocket(match.data?.roomId ?? null, matchId, onEvent);
  connectedRef.current = connected;

  const round = current.data?.round;
  useEffect(() => {
    if (!current.data?.serverTime) return;
    serverOffset.current = Date.parse(current.data.serverTime) - Date.now();
    setOffset(serverOffset.current);
  }, [current.data?.serverTime]);

  // The server sets deadlineAt only when a round is open: keep answers locked until then.
  const awaitingOpen = Boolean(round && !round.deadlineAt);
  const secondsLeft = useCountdown(round ? (round.deadlineAt ?? round.opensAt) : null, offset) ?? 0;

  useEffect(() => {
    setSelectedOption(round?.me.answered ? round.me.optionId : null);
  }, [round?.roundId, round?.me.answered, round?.me.optionId]);

  useEffect(() => {
    if (current.data?.matchFinished) showResult();
  }, [current.data?.matchFinished, showResult]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void current.refetch();
      void match.refetch();
    });
    return () => subscription.remove();
  }, [current.refetch, match.refetch]);

  // Feedback fires once per resolved round.
  const reportedRounds = useRef(new Set<string>());
  const result = current.data?.lastRoundResult;
  useEffect(() => {
    if (!result || reportedRounds.current.has(result.roundId)) return;
    reportedRounds.current.add(result.roundId);
    const next = (kind: Reward['kind'], title: string, subtitle?: string) =>
      setReward((previous) => ({ id: (previous?.id ?? 0) + 1, kind, title, subtitle }));
    if (result.correct) {
      streak.current += 1;
      const total = current.data?.settings.questionCount ?? 0;
      const answered = reportedRounds.current.size;
      const halfway = total >= 6 && answered === Math.ceil(total / 2);
      const points = `+${result.points} điểm`;
      if (halfway) next('milestone', 'Nửa chặng rồi!', points);
      else if (streak.current >= 2) next('streak', `Chuỗi ${streak.current} liên tiếp!`, points);
      else next('solved', 'Chính xác!', points);
      setBurst((previous) => ({ n: previous.n + 1, large: halfway || streak.current >= 3 }));
      haptics.success();
      void sound.play(streak.current >= 2 || halfway ? 'match' : 'correct');
    } else {
      streak.current = 0;
      next('life', 'Chưa đúng', `Còn ${result.livesRemaining} mạng`);
      setDamage((previous) => previous + 1);
      haptics.error();
      void sound.play('wrong');
    }
  }, [result?.roundId]);

  const pendingForRound = pendingAnswer.current?.roundId === round?.roundId ? pendingAnswer.current : null;

  const answer = useCallback(
    async (optionId: string) => {
      if (!round || round.me.answered || awaitingOpen || busy) return;
      const existing = pendingAnswer.current;
      if (existing?.roundId === round.roundId && existing.optionId !== optionId) return;
      const pending: PendingAnswer =
        existing?.roundId === round.roundId && existing.optionId === optionId
          ? existing
          : { roundId: round.roundId, optionId, requestId: createRequestId() };
      pendingAnswer.current = pending;
      haptics.select();
      setSelectedOption(optionId);
      setBusy(true);
      setError('');
      try {
        const ack = await gameApi.rocketAnswer(matchId, round.roundId, pending.requestId, optionId);
        pendingAnswer.current = null;
        if (ack.roundResult?.matchFinished) {
          showResult();
          return;
        }
        qc.setQueryData<RocketCurrent>(['games', 'rocket-current', matchId], (latest) => {
          if (!latest?.round || latest.round.roundId !== ack.roundId) return latest;
          if (ack.roundResult) {
            return { ...latest, round: null, lastRoundResult: ack.roundResult, matchFinished: ack.roundResult.matchFinished };
          }
          return { ...latest, round: { ...latest.round, me: { answered: true, optionId: ack.optionId } } };
        });
        // The ACK is authoritative; a failed resync must not un-answer the question.
        void current.refetch();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Không gửi được câu trả lời. Hãy thử lại đáp án đã chọn.');
        void current.refetch();
      } finally {
        setBusy(false);
      }
    },
    [round, awaitingOpen, busy, matchId, qc, current.refetch, showResult],
  );

  const leave = useCallback(async () => {
    if (leaving) return;
    setLeaving(true);
    setError('');
    try {
      const response = await gameApi.leaveMatch(matchId);
      await qc.invalidateQueries({ queryKey: ['games', 'active'] });
      if (response.resultAvailable) router.replace(resultRoute(matchId, 'ROCKET'));
      else router.replace(PRACTICE_HOME);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể rời ván chơi.');
    } finally {
      setLeaving(false);
    }
  }, [leaving, matchId, qc, router]);

  const confirmLeave = useCallback(
    () =>
      Alert.alert('Rời ván Rocket?', 'Bạn sẽ giữ điểm đã có nhưng rời khỏi lượt chơi.', [
        { text: 'Ở lại', style: 'cancel' },
        { text: 'Rời ván', style: 'destructive', onPress: () => void leave() },
      ]),
    [leave],
  );

  return {
    match,
    current,
    ranking,
    round,
    result,
    connected,
    multiplayer,
    awaitingOpen,
    secondsLeft,
    serverOffset: offset,
    selectedOption,
    pendingForRound,
    busy,
    leaving,
    error,
    answer,
    confirmLeave,
    reward,
    clearReward: useCallback(() => setReward(null), []),
    burst,
    damage,
  };
}
