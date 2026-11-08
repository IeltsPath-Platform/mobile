import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';

import { useAuth } from '@/src/features/auth/auth-provider';

import { gameApi } from '../api';
import { gameErrorMessage } from '../errors';
import { matchRoute, roomRoute, toGameKind, type GameKind } from '../game-meta';
import { isGameAvailable, type PlayerMode, type PlayMode } from '../types';

const parseKind = (value?: string): GameKind | null => (value === 'ROCKET' || value === 'WORDLY' ? value : null);

export const WORD_LIMIT_OPTIONS = [5, 10, 15, 20, 30];

/** Everything the game setup screen needs: queries, form state, derived limits and mutations. */
export function useGameSetup() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gameType?: string; playerMode?: string }>();
  const auth = useAuth();
  const enabled = auth.authEnabled && auth.status === 'authenticated';

  const catalog = useQuery({ queryKey: ['games', 'catalog'], queryFn: gameApi.catalog, enabled, staleTime: 30_000, retry: 1 });
  const filters = useQuery({ queryKey: ['games', 'word-filters'], queryFn: gameApi.wordFilters, enabled, staleTime: 60_000, retry: 1 });
  const active = useQuery({ queryKey: ['games', 'active'], queryFn: gameApi.activeGame, enabled, staleTime: 10_000, retry: 1 });

  const requestedKind = parseKind(params.gameType);
  const [kind, setKind] = useState<GameKind | null>(requestedKind);
  const [mode, setMode] = useState<PlayerMode>(params.playerMode === 'MULTIPLAYER' ? 'MULTIPLAYER' : 'SOLO');
  const [playMode, setPlayMode] = useState<PlayMode>('FINITE');
  const [lives, setLives] = useState(5);
  const [timeEnabled, setTimeEnabled] = useState(true);
  const [wordLimit, setWordLimit] = useState(10);
  const [questionCount, setQuestionCount] = useState(10);
  const [seconds, setSeconds] = useState(15);
  const [cefrLevel, setCefrLevel] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (requestedKind) setKind(requestedKind);
  }, [requestedKind]);

  const minQuestions = mode === 'SOLO' ? 3 : 5;
  // Switching to multiplayer raises the Rocket minimum; keep the form valid.
  useEffect(() => {
    setQuestionCount((count) => Math.max(minQuestions, count));
  }, [minQuestions]);

  const games = catalog.data?.games ?? [];
  const playable = useMemo(
    () => games.filter((item) => (item.gameType === 'WORDLY' || item.gameType === 'ROCKET') && item.status === 'AVAILABLE'),
    [games],
  );
  const currentGame = kind ? playable.find((item) => item.gameType === kind) : undefined;

  const availableWords = filters.data
    ? (filters.data.availability.find((item) => item.cefrLevel === cefrLevel && item.topicId === topicId)?.words ?? 0)
    : undefined;
  const requestedWords = kind === 'ROCKET' ? questionCount : playMode === 'FINITE' ? wordLimit : 5;
  const neededWords = Math.max(requestedWords, kind === 'ROCKET' ? minQuestions : 5);
  const insufficientWords = availableWords !== undefined && availableWords < neededWords;

  const create = useMutation({
    mutationFn: async () => {
      if (!currentGame || !kind) throw new Error('Trò chơi này hiện chưa sẵn sàng.');
      if (insufficientWords) {
        throw new Error(`Kho đang có ${availableWords} từ phù hợp. Hãy giảm số câu/từ hoặc chọn chủ đề khác.`);
      }
      const room =
        kind === 'ROCKET'
          ? await gameApi.createRocket({
              playerMode: mode,
              questionCount,
              initialLives: mode === 'MULTIPLAYER' ? lives : undefined,
              secondsPerQuestion: mode === 'MULTIPLAYER' ? seconds : undefined,
              cefrLevel,
              topicId,
            })
          : await gameApi.create({
              playerMode: mode,
              playMode,
              initialLives: lives,
              wordLimit: playMode === 'ENDLESS' ? null : wordLimit,
              timeEnabled,
              cefrLevel,
              topicId,
            });
      if (mode === 'MULTIPLAYER') return { room, match: null };

      try {
        await gameApi.ready(room.id, true);
      } catch (reason) {
        await gameApi.leaveRoom(room.id).catch(() => undefined);
        throw reason;
      }
      try {
        return { room, match: await gameApi.start(room.id) };
      } catch (reason) {
        // The start response may have been lost; recover if the server did start the match.
        try {
          const latest = await gameApi.getRoom(room.id);
          if (latest.status === 'IN_MATCH' && latest.activeMatchId) {
            return { room: latest, match: await gameApi.getMatch(latest.activeMatchId) };
          }
          if (latest.status === 'WAITING') await gameApi.leaveRoom(room.id).catch(() => undefined);
        } catch {
          // Keep the original start error.
        }
        throw reason;
      }
    },
    onSuccess: ({ room, match }) => {
      void active.refetch();
      router.push(match ? matchRoute(toGameKind(room.gameType), match.matchId) : roomRoute(room.id));
    },
    onError: (reason) => {
      setError(gameErrorMessage(reason));
      void active.refetch();
    },
  });

  const join = useMutation({
    mutationFn: () => {
      const normalized = code.trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(normalized)) throw new Error('Mã phòng cần đúng 6 chữ hoặc số.');
      return gameApi.join(normalized);
    },
    onSuccess: (room) => router.push(roomRoute(room.id)),
    onError: (reason) => {
      setError(reason instanceof Error ? reason.message : 'Không vào được phòng.');
      void active.refetch();
    },
  });

  const leaveActive = useMutation({
    mutationFn: gameApi.leaveActiveGame,
    onSuccess: () => {
      void active.refetch();
      void catalog.refetch();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : 'Không rời được ván đang chơi.'),
  });

  const clearError = () => setError('');

  return {
    router,
    enabled,
    catalog,
    filters,
    active,
    games,
    currentGame,
    kind,
    requestedKind,
    selectKind: (next: GameKind | null) => {
      setKind(next);
      setError('');
    },
    mode,
    setMode,
    playMode,
    setPlayMode,
    lives,
    setLives,
    timeEnabled,
    setTimeEnabled,
    wordLimit,
    setWordLimit,
    questionCount,
    setQuestionCount,
    minQuestions,
    seconds,
    setSeconds,
    cefrLevel,
    setCefrLevel: (value: string | null) => {
      setCefrLevel(value);
      clearError();
    },
    topicId,
    setTopicId: (value: string | null) => {
      setTopicId(value);
      clearError();
    },
    availableWords,
    insufficientWords,
    code,
    setCode: (value: string) => {
      setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
      clearError();
    },
    error,
    clearError,
    create,
    join,
    leaveActive,
    isGameAvailable,
  };
}

export type GameSetup = ReturnType<typeof useGameSetup>;
