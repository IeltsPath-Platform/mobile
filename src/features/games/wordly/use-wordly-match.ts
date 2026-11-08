import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { Reward } from '@/src/components/effects/reward-toast';
import { ApiError } from '@/src/lib/api-client';
import { haptics } from '@/src/lib/haptics';
import { createRequestId } from '@/src/lib/request-id';
import { sound } from '@/src/lib/sound';

import { gameApi } from '../api';
import { PRACTICE_HOME, resultRoute } from '../game-meta';
import { useCountdown } from '../use-countdown';
import { useGameSocket } from '../use-game-socket';
import type { CurrentWord, GameEvent, GameRanking, GuessResponse } from '../types';
import { mergeRanking } from '../types';
import { applyWordHint, hintUnavailableReason } from '../wordly-hint';
import { normalizeWordlyGuess } from '../wordly-input';

type PendingGuess = { wordId: string; guess: string; requestId: string; attemptsUsed: number };

/** Server rejections that will not succeed on retry: the typed answer must be edited. */
function isDefinitiveRejection(cause: unknown, dictionaryRejected: boolean) {
  return (
    dictionaryRejected ||
    (cause instanceof ApiError && cause.status >= 400 && cause.status < 500 && ![408, 409, 425, 429].includes(cause.status))
  );
}

/** All Wordly match state: server sync, typing, guess submission, hints and leaving. */
export function useWordlyMatch(matchId: string) {
  const router = useRouter();
  const qc = useQueryClient();
  const connectedRef = useRef(false);

  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [guessPending, setGuessPending] = useState(false);
  const [hintBusy, setHintBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [reward, setReward] = useState<Reward | null>(null);
  const [burst, setBurst] = useState({ n: 0, large: false });
  const [damage, setDamage] = useState(0);
  const pendingGuess = useRef<PendingGuess | null>(null);
  const hintRequest = useRef<{ wordId: string; requestId: string } | null>(null);
  const hintInFlight = useRef(false);

  const showResult = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['games', 'active'] });
    router.replace(resultRoute(matchId, 'WORDLY'));
  }, [matchId, qc, router]);

  const match = useQuery({
    queryKey: ['games', 'match', matchId],
    queryFn: () => gameApi.getMatch(matchId),
    enabled: Boolean(matchId),
    refetchInterval: () => (connectedRef.current ? 30_000 : 10_000),
  });

  const current = useQuery({
    queryKey: ['games', 'current', matchId],
    queryFn: ({ signal }) => gameApi.current(matchId, signal),
    enabled: Boolean(matchId),
    refetchInterval: (query) => {
      if (guessPending) return 1_000;
      if (query.state.data?.wordStatus !== 'ACTIVE') return false;
      return connectedRef.current ? 15_000 : 5_000;
    },
    retry: (count, cause) => count < 2 && !(cause instanceof Error && /403|404|not active/i.test(cause.message)),
  });

  const multiplayer = match.data?.playerMode === 'MULTIPLAYER';
  const ranking = useQuery({
    queryKey: ['games', 'ranking', matchId],
    queryFn: () => gameApi.ranking(matchId),
    enabled: Boolean(matchId),
    refetchInterval: () => (multiplayer && !connectedRef.current ? 10_000 : false),
  });

  const serverOffset = useMemo(
    () => (ranking.data ? Date.parse(ranking.data.serverTime) - Date.now() : 0),
    [ranking.data?.serverTime],
  );

  const onEvent = useCallback(
    (event: GameEvent) => {
      if (event.match) qc.setQueryData(['games', 'match', matchId], event.match);
      if (event.ranking) {
        const incoming = event.ranking;
        qc.setQueryData<GameRanking>(['games', 'ranking', matchId], (existing) => mergeRanking(existing ?? null, incoming));
      }
      if (event.type === 'MATCH_FINISHED') {
        showResult();
        return;
      }
      if (['WORD_STATE', 'MATCH_STATE', 'MATCH_STARTED'].includes(event.type)) {
        void qc.invalidateQueries({ queryKey: ['games', 'current', matchId] });
      }
      if (!event.match && ['MATCH_STATE', 'MATCH_STARTED'].includes(event.type)) {
        void qc.invalidateQueries({ queryKey: ['games', 'match', matchId] });
      }
      if (!event.ranking && event.type === 'RANKING_UPDATED') {
        void qc.invalidateQueries({ queryKey: ['games', 'ranking', matchId] });
      }
    },
    [matchId, qc, showResult],
  );
  const connected = useGameSocket(match.data?.roomId ?? null, matchId, onEvent);
  connectedRef.current = connected;

  const word = current.data;
  const myTurn = match.data?.playerMode === 'SOLO' || Boolean(match.data?.ownPlayer);
  const pendingForWord = pendingGuess.current?.wordId === word?.playerWordId ? pendingGuess.current : null;
  const seconds = useCountdown(word?.timeEnabled ? word.deadlineAt : null, serverOffset);

  // A new word starts from a clean slate.
  useEffect(() => {
    setGuess('');
    setError('');
    setFeedback('');
    setGuessPending(false);
    pendingGuess.current = null;
  }, [word?.playerWordId]);

  // A pending guess resolves once the server counts the attempt.
  useEffect(() => {
    if (!guessPending || !word || pendingGuess.current?.wordId !== word.playerWordId) return;
    if (word.attemptsUsed > pendingGuess.current.attemptsUsed) {
      pendingGuess.current = null;
      setGuessPending(false);
      setGuess('');
      setError('');
    }
  }, [guessPending, word?.attemptsUsed, word?.playerWordId]);

  // The server decides timeouts; ask for the new state as soon as the clock hits zero.
  useEffect(() => {
    if (seconds !== 0 || word?.wordStatus !== 'ACTIVE') return;
    const timer = setTimeout(() => void current.refetch(), 700);
    return () => clearTimeout(timer);
  }, [seconds, word?.playerWordId, word?.wordStatus, current.refetch]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void current.refetch();
      void match.refetch();
      void ranking.refetch();
    });
    return () => subscription.remove();
  }, [current.refetch, match.refetch, ranking.refetch]);

  useEffect(() => {
    if (match.data?.status === 'COMPLETED') showResult();
  }, [match.data?.status, showResult]);

  const locked =
    !word || !myTurn || word.wordStatus !== 'ACTIVE' || busy || hintBusy || guessPending || Boolean(pendingForWord);
  const canSubmit =
    Boolean(word) &&
    myTurn &&
    word?.wordStatus === 'ACTIVE' &&
    guess.length === word.columns &&
    !busy &&
    !hintBusy &&
    !guessPending &&
    (pendingForWord === null || pendingForWord.guess === guess);

  const changeGuess = useCallback(
    (text: string) => {
      if (locked || !word) return;
      setGuess(normalizeWordlyGuess(text, word.columns));
      setError('');
      setFeedback('');
    },
    [locked, word?.columns],
  );

  /** Turns a graded guess into feedback: toast, confetti, red flash, haptics and sound. */
  const celebrate = (before: CurrentWord, accepted: GuessResponse, solved: boolean) => {
    const lostLife = accepted.player.livesRemaining < before.player.livesRemaining;
    const streak = accepted.player.currentStreak;
    const nextNumber = accepted.nextWord?.wordNumber ?? 0;
    const points = `+${accepted.points.total} điểm`;
    const next = (kind: Reward['kind'], title: string, subtitle?: string) =>
      setReward((previous) => ({ id: (previous?.id ?? 0) + 1, kind, title, subtitle }));
    if (solved) {
      const milestone = nextNumber > 1 && (nextNumber - 1) % 5 === 0;
      if (milestone) next('milestone', `Đã qua ${nextNumber - 1} từ!`, points);
      else if (streak >= 2) next('streak', `Chuỗi ${streak} liên tiếp!`, points);
      else next('solved', 'Chính xác!', points);
      setBurst((previous) => ({ n: previous.n + 1, large: milestone || streak >= 3 }));
      haptics.success();
      void sound.play(streak >= 2 || milestone ? 'match' : 'correct');
    } else if (lostLife) {
      next('life', 'Mất 1 mạng', `Còn ${accepted.player.livesRemaining} mạng`);
      setDamage((previous) => previous + 1);
      haptics.error();
      void sound.play('wrong');
    } else {
      setFeedback('Thêm một manh mối rồi, thử lại nhé');
      haptics.warning();
      void sound.play('wrong');
    }
  };

  const submit = useCallback(async () => {
    if (!word || !canSubmit || hintInFlight.current) return;
    setBusy(true);
    setError('');
    if (pendingGuess.current?.wordId !== word.playerWordId || pendingGuess.current.guess !== guess) {
      pendingGuess.current = {
        wordId: word.playerWordId,
        guess,
        requestId: createRequestId(),
        attemptsUsed: word.attemptsUsed,
      };
    }
    try {
      const result = await gameApi.guess(matchId, {
        requestId: pendingGuess.current.requestId,
        playerWordId: word.playerWordId,
        guess,
      });
      if ('code' in result && result.code === 'REQUEST_PENDING') {
        setGuessPending(true);
        setError('Đang xử lý lượt đoán, trạng thái sẽ tự đồng bộ.');
        void current.refetch();
      } else {
        const accepted = result as GuessResponse;
        const solved = accepted.letters.every((status) => status === 'CORRECT');
        pendingGuess.current = null;
        setGuessPending(false);
        celebrate(word, accepted, solved);
        if (accepted.nextWord) qc.setQueryData(['games', 'current', matchId], accepted.nextWord);
        else void qc.invalidateQueries({ queryKey: ['games', 'current', matchId] });
        if (accepted.matchFinished) {
          showResult();
          return;
        }
        setGuess('');
      }
      void qc.invalidateQueries({ queryKey: ['games', 'match', matchId] });
      void qc.invalidateQueries({ queryKey: ['games', 'ranking', matchId] });
    } catch (cause) {
      haptics.error();
      void sound.play('wrong');
      setShakeKey((key) => key + 1);
      void current.refetch();
      const message = cause instanceof Error ? cause.message : '';
      const dictionaryRejected = /word was not found in this match's dictionary/i.test(message);
      const definitive = isDefinitiveRejection(cause, dictionaryRejected);
      if (definitive) {
        // The server rejected this answer for good; release the lock so it can be edited.
        pendingGuess.current = null;
        setGuessPending(false);
      }
      if (dictionaryRejected) setError('Từ này không có trong bộ từ của ván. Hãy sửa đáp án rồi thử lại.');
      else if (definitive) setError(message || 'Đáp án chưa hợp lệ. Hãy kiểm tra rồi thử lại.');
      else setError('Kết nối chập chờn. Nhấn ĐOÁN để gửi lại cùng đáp án.');
    } finally {
      setBusy(false);
    }
  }, [word, canSubmit, guess, matchId, qc, current.refetch, showResult]);

  const hintReason = word ? hintUnavailableReason(word) : null;
  const hintDisabled =
    hintBusy || busy || guessPending || !myTurn || Boolean(word?.hint?.hintUsed) || Boolean(hintReason);

  const useHint = useCallback(async () => {
    if (!word || hintInFlight.current || hintDisabled) return;
    hintInFlight.current = true;
    if (hintRequest.current?.wordId !== word.playerWordId) {
      hintRequest.current = { wordId: word.playerWordId, requestId: createRequestId() };
    }
    setHintBusy(true);
    setError('');
    try {
      await qc.cancelQueries({ queryKey: ['games', 'current', matchId] });
      const hint = await gameApi.hint(matchId, word.playerWordId, hintRequest.current.requestId);
      hintRequest.current = null;
      await qc.cancelQueries({ queryKey: ['games', 'current', matchId] });
      qc.setQueryData<CurrentWord>(['games', 'current', matchId], (previous) => applyWordHint(previous, hint));
      haptics.tap();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được gợi ý.');
    } finally {
      hintInFlight.current = false;
      setHintBusy(false);
    }
  }, [word, hintDisabled, matchId, qc]);

  const leave = useCallback(async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      const result = await gameApi.leaveMatch(matchId);
      if (result.resultAvailable) showResult();
      else {
        void qc.invalidateQueries({ queryKey: ['games', 'active'] });
        router.replace(PRACTICE_HOME);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa thể kết thúc ván. Hãy thử lại.');
      setLeaving(false);
    }
  }, [leaving, matchId, qc, router, showResult]);

  const confirmLeave = useCallback(
    () =>
      Alert.alert('Rời ván Wordly?', 'Điểm sẽ được lưu nếu máy chủ đã có kết quả.', [
        { text: 'Ở lại', style: 'cancel' },
        { text: 'Rời ván', style: 'destructive', onPress: () => void leave() },
      ]),
    [leave],
  );

  return {
    match,
    current,
    ranking,
    word,
    connected,
    myTurn,
    multiplayer,
    seconds,
    guess,
    feedback,
    error,
    busy,
    leaving,
    shakeKey,
    locked,
    canSubmit,
    hintBusy,
    hintDisabled,
    hintReason,
    changeGuess,
    reward,
    clearReward: useCallback(() => setReward(null), []),
    burst,
    damage,
    submit,
    useHint,
    confirmLeave,
  };
}
