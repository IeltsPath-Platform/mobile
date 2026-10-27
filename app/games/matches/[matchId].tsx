import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Lightbulb, Wifi, WifiOff } from 'lucide-react-native';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { gameApi } from '@/src/features/games/api';
import { useGameSocket } from '@/src/features/games/use-game-socket';
import type { GameEvent, CurrentWord, LetterStatus } from '@/src/features/games/types';
import { dueAt } from '@/src/features/games/types';
import { createRequestId } from '@/src/lib/request-id';
import { colors } from '@/src/theme';

const keyRows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const statusColor: Record<LetterStatus, string> = { CORRECT: '#16845b', PRESENT: '#d89b14', ABSENT: '#64748b' };

export default function WordlyMatchScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>(); const router = useRouter(); const qc = useQueryClient();
  const [guess, setGuess] = useState(''); const [busy, setBusy] = useState(false); const [hintBusy, setHintBusy] = useState(false); const [error, setError] = useState(''); const [seconds, setSeconds] = useState<number | null>(null);
  const pendingGuess = useRef<{ wordId: string; guess: string; requestId: string } | null>(null); const hintRequest = useRef<{ wordId: string; requestId: string } | null>(null);
  const match = useQuery({ queryKey: ['games', 'match', matchId], queryFn: () => gameApi.getMatch(matchId), enabled: Boolean(matchId), refetchInterval: 15_000 });
  const current = useQuery({ queryKey: ['games', 'current', matchId], queryFn: () => gameApi.current(matchId), enabled: Boolean(matchId), refetchInterval: (q) => q.state.data?.wordStatus === 'ACTIVE' ? 5_000 : false, retry: (count, e) => count < 2 && !(e instanceof Error && /403|404|not active/i.test(e.message)) });
  const ranking = useQuery({ queryKey: ['games', 'ranking', matchId], queryFn: () => gameApi.ranking(matchId), enabled: Boolean(matchId), refetchInterval: 10_000 });
  const onEvent = useCallback((event: GameEvent) => { if (event.match) qc.setQueryData(['games', 'match', matchId], event.match); if (event.ranking) qc.setQueryData(['games', 'ranking', matchId], event.ranking); if (event.type === 'MATCH_FINISHED') router.replace({ pathname: '/games/results/[matchId]', params: { matchId, gameType: 'WORDLY' } } as never); void qc.invalidateQueries({ queryKey: ['games', 'current', matchId] }); void qc.invalidateQueries({ queryKey: ['games', 'match', matchId] }); void qc.invalidateQueries({ queryKey: ['games', 'ranking', matchId] }); }, [matchId, qc, router]);
  const connected = useGameSocket(match.data?.roomId ?? null, matchId, onEvent);
  const word = current.data; const myTurn = match.data?.playerMode === 'SOLO' || Boolean(match.data?.ownPlayer);
  useEffect(() => { if (!word?.deadlineAt || !word.timeEnabled) { setSeconds(null); return; } const tick = () => setSeconds(dueAt(word.deadlineAt, Date.now())); tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer); }, [word?.deadlineAt, word?.timeEnabled]);
  useEffect(() => { const sub = AppState.addEventListener('change', (state) => { if (state === 'active') { void current.refetch(); void match.refetch(); void ranking.refetch(); } }); return () => sub.remove(); }, [current.refetch, match.refetch, ranking.refetch]);
  useEffect(() => { if (match.data?.status === 'COMPLETED') router.replace({ pathname: '/games/results/[matchId]', params: { matchId, gameType: 'WORDLY' } } as never); }, [match.data?.status, matchId, router]);
  const submit = async () => {
    if (!word || busy || guess.length !== word.columns) return;
    setBusy(true); setError('');
    const normalizedGuess = guess.toUpperCase();
    if (pendingGuess.current?.wordId !== word.playerWordId || pendingGuess.current.guess !== normalizedGuess) pendingGuess.current = { wordId: word.playerWordId, guess: normalizedGuess, requestId: createRequestId() };
    const body = { requestId: pendingGuess.current.requestId, playerWordId: word.playerWordId, guess: normalizedGuess };
    try {
      const result = await gameApi.guess(matchId, body);
      if ('code' in result && result.code === 'REQUEST_PENDING') { setError('Đang xử lý lượt đoán. Trạng thái sẽ tự đồng bộ ngay sau đó.'); }
      else { const accepted = result as import('@/src/features/games/types').GuessResponse; pendingGuess.current = null; if (accepted.nextWord) qc.setQueryData(['games', 'current', matchId], accepted.nextWord); else void qc.invalidateQueries({ queryKey: ['games', 'current', matchId] }); if (accepted.matchFinished) { router.replace({ pathname: '/games/results/[matchId]', params: { matchId, gameType: 'WORDLY' } } as never); return; } setGuess(''); }
      void qc.invalidateQueries({ queryKey: ['games', 'match', matchId] }); void qc.invalidateQueries({ queryKey: ['games', 'ranking', matchId] });
    } catch (e) { setError(e instanceof Error ? e.message : 'Không gửi được lượt đoán.'); }
    finally { setBusy(false); }
  };
  const useHint = async () => { if (!word || hintBusy || word.hint?.hintUsed) return; if (hintRequest.current?.wordId !== word.playerWordId) hintRequest.current = { wordId: word.playerWordId, requestId: createRequestId() }; setHintBusy(true); setError(''); try { const hint = await gameApi.hint(matchId, word.playerWordId, hintRequest.current.requestId); hintRequest.current = null; qc.setQueryData<CurrentWord>(['games','current',matchId], (prev) => prev ? { ...prev, hint } : prev); } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được gợi ý.'); } finally { setHintBusy(false); } };
  const guessedRows = useMemo(() => word?.guesses ?? [], [word]);
  if (match.isPending || current.isPending) return <View className="flex-1 items-center justify-center bg-canvas"><ActivityIndicator color={colors.accent} /><Text className="mt-3 text-sm text-muted">Đang đồng bộ ván chơi…</Text></View>;
  if (match.isError || !match.data) return <View className="flex-1 justify-center bg-canvas px-5"><Text weight="bold">Không tải được ván chơi.</Text><Button className="mt-4" label="Thử lại" onPress={() => { void match.refetch(); void current.refetch(); }} /></View>;
  if (current.isError && !word) return <View className="flex-1 justify-center bg-canvas px-5"><Text weight="bold">Chưa thể tải lượt chơi hiện tại.</Text><Text className="mt-2 text-sm text-muted">Có thể bạn chưa được xếp lượt trong ván nhiều người.</Text><Button className="mt-4" label="Đồng bộ lại" onPress={() => void current.refetch()} /></View>;
  return <View className="flex-1 bg-canvas"><ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-10 pt-3">
    <View className="flex-row items-center justify-between"><Pressable onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full bg-white"><ArrowLeft size={20} color={colors.ink}/></Pressable><View className="flex-row items-center gap-2">{connected?<Wifi size={16} color={colors.success}/>:<WifiOff size={16} color={colors.muted}/>}<Text className="text-xs text-muted">{connected?'Đang đồng bộ':'Đang kết nối lại'}</Text></View></View>
    <View className="mt-5 flex-row items-center justify-between"><View><Text weight="bold" className="text-xs uppercase tracking-widest text-accent">Wordly · Từ {word?.wordNumber ?? '—'}{word?.wordLimit ? `/${word.wordLimit}` : ''}</Text><Text weight="black" className="mt-2 text-3xl">Đoán từ bí mật</Text></View><View className="items-end"><Text weight="black" className="text-xl text-danger">♥ {word?.player.livesRemaining ?? '—'}</Text><Text className="mt-1 text-xs text-muted">{seconds === null ? `${word?.attemptsUsed ?? 0}/${word?.maxAttempts ?? 0} lượt` : `${seconds}s`}</Text></View></View>
    {word ? <><View className="mt-5 rounded-3xl border border-line bg-white p-5"><Text className="text-center text-xs uppercase tracking-wide text-muted">Gợi ý nghĩa</Text><Text weight="bold" className="mt-2 text-center text-lg leading-7">{word.meaning}</Text><View className="mt-5 items-center gap-2">{Array.from({ length: word.maxAttempts }, (_, row) => { const past = guessedRows[row]; const active = row === guessedRows.length; return <View key={row} className="flex-row gap-2">{Array.from({ length: word.columns }, (_, column) => { const letter = past?.guess[column] ?? (active ? guess[column] : ''); const status = past?.letters[column]; const hinted = word.hint?.revealedCell.column === column; return <View key={column} className="h-11 w-11 items-center justify-center rounded-xl border" style={{ backgroundColor: status ? statusColor[status] : hinted ? '#eaf1ff' : '#fff', borderColor: status ? statusColor[status] : hinted ? colors.accent : colors.line }}><Text weight="black" className="text-lg" style={{ color: status ? 'white' : colors.ink }}>{letter || (hinted ? word.hint?.revealedCell.letter : '')}</Text></View>; })}</View>; })}</View><View className="mt-4 flex-row items-center justify-between"><Text className="text-xs text-muted">Điểm {word.player.totalScore} · Chuỗi {word.player.currentStreak}</Text><Pressable disabled={hintBusy || Boolean(word.hint?.hintUsed)} onPress={() => void useHint()} className="min-h-11 flex-row items-center gap-2 rounded-xl bg-accent-soft px-3"><Lightbulb size={16} color={colors.accent}/><Text weight="bold" className="text-xs text-accent">{hintBusy?'Đang lấy…':word.hint?.hintUsed?'Đã dùng':'Gợi ý'}</Text></Pressable></View></View>
      <View className="mt-4 gap-2">{keyRows.map((row) => <View key={row} className="flex-row justify-center gap-1.5">{[...row].map((letter) => { const status = word.keyboard[letter]; return <Pressable key={letter} disabled={!myTurn || busy || Boolean(status==='ABSENT')} onPress={() => setGuess((old) => old.length < word.columns ? old + letter : old)} className="h-11 min-w-8 flex-1 items-center justify-center rounded-lg" style={{ backgroundColor: status ? statusColor[status] : 'white' }}><Text weight="bold" className="text-xs" style={{ color: status ? 'white' : colors.ink }}>{letter}</Text></Pressable>; })}</View>)}<View className="flex-row justify-center gap-2"><Pressable onPress={() => setGuess((old) => old.slice(0,-1))} disabled={!guess || busy} className="h-11 flex-1 items-center justify-center rounded-xl bg-white"><Text weight="bold" className="text-xs">⌫ Xóa</Text></Pressable><Button className="flex-[2]" label={busy?'Đang kiểm tra…':'Đoán từ'} loading={busy} disabled={guess.length!==word.columns||!myTurn||word.wordStatus!=='ACTIVE'} onPress={() => void submit()} /></View></View>
      {error ? <Text accessibilityRole="alert" className="mt-3 text-center text-sm text-danger">{error}</Text> : null}
      {!myTurn ? <Text className="mt-3 text-center text-sm text-muted">Đang chờ đến lượt của bạn.</Text> : null}
      <View className="mt-5 rounded-2xl border border-line bg-white p-4"><Text weight="bold">Bảng xếp hạng</Text>{ranking.data?.players.map((player) => <View key={player.userId} className="mt-3 flex-row justify-between"><Text className="text-sm">#{player.rank} {player.displayName ?? 'Người chơi'}</Text><Text weight="bold" className="text-sm">{player.totalScore} điểm</Text></View>)}</View>
      </> : null}
  </ScrollView></View>;
}
