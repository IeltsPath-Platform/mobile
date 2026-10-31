import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Flame, Gamepad2, Rocket, Users, UserRound } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { useAuth } from '@/src/features/auth/auth-provider';
import { gameApi } from '@/src/features/games/api';
import { gameErrorMessage } from '@/src/features/games/errors';
import { isGameAvailable, type PlayerMode, type PlayMode } from '@/src/features/games/types';
import { colors } from '@/src/theme';

type GameType = 'WORDLY' | 'ROCKET';
const routeForMatch = (gameType: string, matchId: string) => gameType === 'ROCKET' ? `/games/rocket/${matchId}` as never : `/games/matches/${matchId}` as never;

export default function GameCatalogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gameType?: string; playerMode?: string }>();
  const auth = useAuth();
  const enabled = auth.authEnabled && auth.status === 'authenticated';
  const catalog = useQuery({ queryKey: ['games', 'catalog'], queryFn: gameApi.catalog, enabled, staleTime: 0, refetchOnMount: 'always', retry: 1 });
  const active = useQuery({ queryKey: ['games', 'active'], queryFn: gameApi.activeGame, enabled, staleTime: 10_000, retry: 1 });
  const [gameType, setGameType] = useState<GameType>(params.gameType === 'ROCKET' ? 'ROCKET' : 'WORDLY');
  const [mode, setMode] = useState<PlayerMode>(params.playerMode === 'MULTIPLAYER' ? 'MULTIPLAYER' : 'SOLO');
  const [playMode, setPlayMode] = useState<PlayMode>('FINITE');
  const [lives, setLives] = useState(5);
  const [timeEnabled, setTimeEnabled] = useState(true);
  const [wordLimit, setWordLimit] = useState('10');
  const [questionCount, setQuestionCount] = useState('10');
  const [seconds, setSeconds] = useState(15);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const games = catalog.data?.games ?? [];
  const available = useMemo(() => games.filter((item) => item.status === 'AVAILABLE'), [games]);
  const currentGame = available.find((item) => item.gameType === gameType);
  useEffect(() => {
    if (!catalog.data || currentGame) return;
    const fallback = available.find((item) => item.gameType === 'WORDLY' || item.gameType === 'ROCKET');
    if (fallback) setGameType(fallback.gameType as GameType);
  }, [available, catalog.data, currentGame]);
  const create = useMutation({
    mutationFn: async () => {
      if (!currentGame) throw new Error('Trò chơi này hiện chưa sẵn sàng.');
      const parsedCount = Number(questionCount);
      const parsedLimit = Number(wordLimit);
      if (gameType === 'ROCKET' && (!Number.isInteger(parsedCount) || parsedCount < (mode === 'SOLO' ? 3 : 5) || parsedCount > 20)) throw new Error(`Số câu phải từ ${mode === 'SOLO' ? 3 : 5} đến 20.`);
      if (gameType === 'WORDLY' && playMode === 'FINITE' && (!Number.isInteger(parsedLimit) || parsedLimit < 5)) throw new Error('Số từ phải là số nguyên từ 5 trở lên.');
      const room = gameType === 'ROCKET'
        ? await gameApi.createRocket({ playerMode: mode, questionCount: parsedCount, initialLives: mode === 'MULTIPLAYER' ? lives : undefined, secondsPerQuestion: mode === 'MULTIPLAYER' ? seconds : undefined })
        : await gameApi.create({ playerMode: mode, playMode, initialLives: lives, wordLimit: playMode === 'ENDLESS' ? null : parsedLimit, timeEnabled });
      if (mode === 'MULTIPLAYER') return { room, match: null };
      await gameApi.ready(room.id, true);
      try { return { room, match: await gameApi.start(room.id) }; }
      catch (reason) {
        try {
          const latest = await gameApi.getRoom(room.id);
          if (latest.status === 'IN_MATCH' && latest.activeMatchId) return { room: latest, match: await gameApi.getMatch(latest.activeMatchId) };
        } catch {
          // Preserve the start error; the follow-up room lookup is only recovery for a lost response.
        }
        throw reason;
      }
    },
    onSuccess: ({ room, match }) => {
      void active.refetch();
      router.push(match ? routeForMatch(room.gameType === 'ROCKET' ? 'ROCKET' : 'WORDLY', match.matchId) : `/games/rooms/${room.id}` as never);
    },
    onError: (reason) => { setError(gameErrorMessage(reason)); void active.refetch(); },
  });
  const join = useMutation({
    mutationFn: () => { const normalized = code.trim().toUpperCase(); if (!/^[A-Z0-9]{6}$/.test(normalized)) throw new Error('Mã phòng cần đúng 6 chữ hoặc số.'); return gameApi.join(normalized); },
    onSuccess: (room) => router.push(`/games/rooms/${room.id}` as never),
    onError: (reason) => { setError(reason instanceof Error ? reason.message : 'Không vào được phòng.'); void active.refetch(); },
  });
  const leaveActive = useMutation({
    mutationFn: gameApi.leaveActiveGame,
    onSuccess: () => { void active.refetch(); void catalog.refetch(); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : 'Không rời được ván đang chơi.'),
  });
  const activeRoute = active.data?.matchId ? routeForMatch(active.data.gameType, active.data.matchId) : active.data ? `/games/rooms/${active.data.roomId}` as never : null;

  return <View className="flex-1 bg-canvas"><ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-12 pt-3">
    <Pressable accessibilityRole="button" onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full bg-surface"><ArrowLeft size={20} color={colors.ink} /></Pressable>
    <View className="mt-5"><Text weight="bold" className="text-xs uppercase tracking-widest text-accent">HỌC QUA TRÒ CHƠI</Text><Text weight="black" className="mt-1 text-3xl">Chọn thử thách của bạn</Text><Text className="mt-2 text-sm leading-6 text-muted">Luyện từ vựng, phản xạ và chơi cùng bạn bè.</Text></View>

    {!enabled ? <Card className="mt-5 border-b-0 bg-surface p-5"><Text weight="bold">Đăng nhập để chơi</Text><Text className="mt-2 text-sm text-muted">Phòng chơi và kết quả sẽ được đồng bộ với tài khoản.</Text><Button className="mt-4" label="Đăng nhập" onPress={() => router.push('/(auth)/login' as never)} /></Card> : null}
    {enabled && active.isSuccess && active.data && activeRoute ? <Card className="mt-5 border-0 p-5" style={{ backgroundColor: colors.accentSoft }}><View className="flex-row items-center"><View className="h-10 w-10 items-center justify-center rounded-xl bg-surface"><Gamepad2 size={20} color={colors.accent} /></View><View className="ml-3 flex-1"><Text weight="bold">Bạn đang có ván {active.data.gameType === 'ROCKET' ? 'Rocket' : 'Wordly'}</Text><Text className="mt-1 text-xs text-muted">{active.data.roomStatus === 'WAITING' ? `Phòng ${active.data.roomCode} đang chờ` : 'Ván chơi đang diễn ra'}</Text></View></View><View className="mt-4 flex-row gap-2"><Button className="flex-1" label={active.data.roomStatus === 'WAITING' ? 'Vào phòng' : 'Chơi tiếp'} onPress={() => router.push(activeRoute)} /><Button variant="secondary" label="Rời ván" loading={leaveActive.isPending} onPress={() => Alert.alert('Rời ván đang chơi?', 'Bạn sẽ không thể tiếp tục ván hiện tại.', [{ text: 'Ở lại', style: 'cancel' }, { text: 'Rời ván', style: 'destructive', onPress: () => leaveActive.mutate() }])} /></View></Card> : null}

    {catalog.isPending && enabled ? <ActivityIndicator className="py-10" color={colors.accent} /> : null}
    {catalog.isError && enabled ? <Card className="mt-5 border-b-0 bg-surface p-5"><Text weight="bold">Không tải được danh sách trò chơi</Text><Text className="mt-2 text-sm text-muted">{catalog.error.message}</Text><Button className="mt-4" variant="secondary" label="Thử lại" onPress={() => void catalog.refetch()} /></Card> : null}
    {catalog.isSuccess && enabled ? <>
      <Text weight="black" className="mb-3 mt-6 text-xl">Trò chơi</Text>
      <View className="gap-3">{games.filter((item) => item.gameType === 'WORDLY' || item.gameType === 'ROCKET').map((item) => {
        const type = item.gameType === 'ROCKET' ? 'ROCKET' : 'WORDLY';
        const selected = gameType === type;
        const canPlay = isGameAvailable(item, type);
        const Icon = type === 'ROCKET' ? Rocket : Gamepad2;
        const tone = type === 'ROCKET' ? { foreground: colors.accentWarm, background: colors.warmSoft } : { foreground: colors.accent, background: colors.accentSoft };
        return <Pressable key={item.gameType} disabled={!canPlay} onPress={() => { setGameType(type); setError(''); }} className="rounded-3xl border bg-surface p-4" style={{ borderColor: selected ? tone.foreground : colors.line, opacity: canPlay ? 1 : 0.6 }} accessibilityRole="radio" accessibilityState={{ selected, disabled: !canPlay }}>
          <View className="flex-row items-center"><View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: tone.background }}><Icon size={23} color={tone.foreground} /></View><View className="ml-3 flex-1"><Text weight="black" className="text-base">{item.name}</Text><Text className="mt-1 text-xs leading-5 text-muted">{item.description}</Text></View><View className="rounded-full px-2.5 py-1" style={{ backgroundColor: canPlay ? colors.successSoft : colors.surfaceTint }}><Text weight="bold" className="text-[10px]" style={{ color: canPlay ? colors.success : colors.muted }}>{canPlay ? 'SẴN SÀNG' : 'SẮP RA MẮT'}</Text></View></View>
        </Pressable>;
      })}</View>

      {currentGame ? <>
        <Text weight="black" className="mb-3 mt-6 text-xl">Thiết lập {currentGame.name}</Text>
        <Card className="border-b-0 bg-surface p-4">
          <View className="flex-row gap-3">{(['SOLO', 'MULTIPLAYER'] as PlayerMode[]).map((item) => { const selected = mode === item; return <Pressable key={item} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => { setMode(item); if (gameType === 'ROCKET' && item === 'MULTIPLAYER') setQuestionCount((count) => String(Math.max(5, Number(count) || 5))); }} className="min-h-14 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border" style={{ borderColor: selected ? colors.accent : colors.line, backgroundColor: selected ? colors.accentSoft : colors.surface }}><View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: selected ? colors.surface : colors.canvas }}>{item === 'SOLO' ? <UserRound size={16} color={colors.accent} /> : <Users size={16} color={colors.accent} />}</View><Text weight="bold" className="text-sm">{item === 'SOLO' ? 'Chơi đơn' : 'Cùng bạn'}</Text></Pressable>; })}</View>

          {gameType === 'WORDLY' ? <>
            <View className="mt-4 flex-row rounded-xl p-1" style={{ backgroundColor: colors.surfaceTint }}>{(['FINITE', 'ENDLESS'] as PlayMode[]).map((item) => <Pressable key={item} onPress={() => setPlayMode(item)} className="min-h-10 flex-1 items-center justify-center rounded-lg" style={{ backgroundColor: playMode === item ? colors.surface : 'transparent' }}><Text weight="bold" className="text-xs" style={{ color: playMode === item ? colors.accent : colors.muted }}>{item === 'FINITE' ? 'Số từ' : 'Vô hạn'}</Text></Pressable>)}</View>
            {playMode === 'FINITE' ? <View className="mt-3 flex-row items-center justify-between"><Text className="text-sm">Số từ (tối thiểu 5)</Text><TextInput value={wordLimit} onChangeText={setWordLimit} keyboardType="number-pad" className="h-11 w-24 rounded-xl border border-line bg-canvas px-3 text-center text-ink" accessibilityLabel="Số từ trong ván" /></View> : null}
            {mode === 'SOLO' ? <View className="mt-3 min-h-12 flex-row items-center justify-between"><Text className="text-sm">Giới hạn thời gian</Text><Switch value={timeEnabled} onValueChange={setTimeEnabled} trackColor={{ true: colors.accent }} accessibilityLabel="Bật giới hạn thời gian" /></View> : null}
          </> : <>
            <View className="mt-4 flex-row items-center justify-between"><Text className="text-sm">Số câu hỏi {mode === 'SOLO' ? '(3–20)' : '(5–20)'}</Text><View className="flex-row items-center gap-3"><Pressable onPress={() => setQuestionCount((n) => String(Math.max(mode === 'SOLO' ? 3 : 5, Number(n) - 1)))} className="h-10 w-10 items-center justify-center rounded-xl bg-canvas"><Text weight="bold">−</Text></Pressable><TextInput value={questionCount} onChangeText={setQuestionCount} keyboardType="number-pad" className="h-10 w-14 rounded-xl border border-line text-center text-ink" accessibilityLabel="Số câu Rocket"/><Pressable onPress={() => setQuestionCount((n) => String(Math.min(20, Number(n) + 1)))} className="h-10 w-10 items-center justify-center rounded-xl bg-canvas"><Text weight="bold">+</Text></Pressable></View></View>
            {mode === 'MULTIPLAYER' ? <><View className="mt-3 flex-row items-center justify-between"><Text className="text-sm">Mạng mỗi người</Text><View className="flex-row items-center gap-3"><Pressable onPress={() => setLives((n) => Math.max(3, n - 1))} className="h-10 w-10 items-center justify-center rounded-xl bg-canvas"><Text weight="bold">−</Text></Pressable><Text weight="bold">{lives}</Text><Pressable onPress={() => setLives((n) => Math.min(6, n + 1))} className="h-10 w-10 items-center justify-center rounded-xl bg-canvas"><Text weight="bold">+</Text></Pressable></View></View><Text weight="semibold" className="mb-2 mt-3 text-xs text-muted">Thời gian mỗi câu</Text><View className="flex-row gap-2">{[10, 15, 20].map((value) => <Pressable key={value} onPress={() => setSeconds(value)} className="min-h-10 flex-1 items-center justify-center rounded-xl" style={{ backgroundColor: seconds === value ? colors.accentSoft : colors.canvas }}><Text weight="bold" className="text-xs" style={{ color: seconds === value ? colors.accent : colors.muted }}>{value} giây</Text></Pressable>)}</View></> : <View className="mt-3 flex-row items-center gap-2 rounded-xl p-3" style={{ backgroundColor: colors.warmSoft }}><Flame size={16} color={colors.accentWarm}/><Text className="flex-1 text-xs leading-5" style={{ color: colors.xpDeep }}>Chơi đơn có 4 mạng và 15 giây mỗi câu.</Text></View>}
          </>}

          {error ? <Text accessibilityRole="alert" className="mt-3 text-sm text-danger">{error}</Text> : null}
          <Button className="mt-4" label={create.isPending ? 'Đang tạo…' : mode === 'SOLO' ? 'Bắt đầu chơi' : 'Tạo phòng bạn bè'} loading={create.isPending} disabled={!currentGame || create.isPending || Boolean(active.data)} onPress={() => { setError(''); create.mutate(); }} />
        </Card>
      </> : null}

      <Card className="mt-5 border-b-0 bg-surface p-4"><View className="flex-row items-center gap-2"><Users size={19} color={colors.accent}/><Text weight="bold" className="text-base">Tham gia phòng bạn bè</Text></View><Text className="mt-2 text-sm text-muted">Nhập mã phòng 6 ký tự để vào Wordly hoặc Rocket.</Text><TextInput value={code} onChangeText={(value) => { setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setError(''); }} autoCapitalize="characters" maxLength={6} placeholder="AB7K2Q" className="mt-3 h-12 rounded-xl border border-line bg-canvas px-4 text-center text-lg tracking-widest text-ink" accessibilityLabel="Mã phòng"/><Button className="mt-3" variant="secondary" label={join.isPending ? 'Đang vào…' : 'Vào phòng'} loading={join.isPending} disabled={!enabled || join.isPending || Boolean(active.data)} onPress={() => { setError(''); join.mutate(); }} /></Card>
      {error && !currentGame ? <Text accessibilityRole="alert" className="mt-3 text-center text-sm text-danger">{error}</Text> : null}
      <View className="mt-6 flex-row items-center justify-center gap-2"><ArrowRight size={15} color={colors.success}/><Text className="text-xs text-muted">Mọi câu trả lời và kết quả đều được lưu trên backend.</Text></View>
    </> : null}
  </ScrollView></View>;
}
