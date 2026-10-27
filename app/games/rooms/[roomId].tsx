import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Copy, Crown, LogOut, Rocket, Users, Wifi, WifiOff } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, Switch, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { gameApi } from '@/src/features/games/api';
import { useGameSocket } from '@/src/features/games/use-game-socket';
import type { GameEvent, GameRoom, RoomSettings } from '@/src/features/games/types';
import { colors } from '@/src/theme';

const matchRoute = (room: GameRoom, matchId: string) => room.gameType === 'ROCKET' ? `/games/rocket/${matchId}` as never : `/games/matches/${matchId}` as never;

export default function GameRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter(); const qc = useQueryClient(); const user = useCurrentUser();
  const [error, setError] = useState('');
  const query = useQuery({ queryKey: ['games', 'room', roomId], queryFn: () => gameApi.getRoom(roomId), enabled: Boolean(roomId), refetchInterval: 15_000, retry: 1 });
  const room = query.data;
  const onEvent = useCallback((event: GameEvent) => {
    if (event.type === 'ROOM_CLOSED' || event.type === 'PLAYER_KICKED') setError(event.message ?? 'Phòng chơi đã kết thúc.');
    if (event.room) qc.setQueryData(['games', 'room', roomId], event.room);
    const liveRoom = qc.getQueryData<GameRoom>(['games', 'room', roomId]);
    if (event.type === 'MATCH_STARTED' && event.match && liveRoom) router.replace(matchRoute(liveRoom, event.match.matchId));
    void qc.invalidateQueries({ queryKey: ['games', 'room', roomId] });
  }, [qc, roomId, router]);
  const connected = useGameSocket(roomId || null, null, onEvent);
  const member = room?.members.find((item) => item.userId === user.data?.id);
  const host = room?.hostUserId === user.data?.id;
  const rocket = room?.gameType === 'ROCKET';
  const settings = room?.settings;

  const ready = useMutation({ mutationFn: () => gameApi.ready(roomId, member?.status !== 'READY'), onSuccess: (next) => { qc.setQueryData(['games', 'room', roomId], next); setError(''); }, onError: (reason) => setError(reason instanceof Error ? reason.message : 'Không cập nhật được trạng thái.') });
  const start = useMutation({ mutationFn: () => gameApi.start(roomId), onSuccess: (match) => { if (room) router.replace(matchRoute(room, match.matchId)); }, onError: async (reason) => { const latest = await gameApi.getRoom(roomId).catch(() => null); if (latest) qc.setQueryData(['games', 'room', roomId], latest); setError(reason instanceof Error ? reason.message : 'Không bắt đầu được ván chơi.'); } });
  const leave = useMutation({ mutationFn: async () => room?.activeMatchId && room.status === 'IN_MATCH' ? gameApi.leaveMatch(room.activeMatchId) : gameApi.leaveRoom(roomId), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['games'] }); router.replace('/games' as never); }, onError: (reason) => setError(reason instanceof Error ? reason.message : 'Không rời được phòng.') });
  const update = useMutation({
    mutationFn: (body: { initialLives: number; wordLimit?: number | null; timeEnabled?: boolean; questionCount?: number | null; secondsPerQuestion?: number | null }) => gameApi.settings(roomId, body),
    onSuccess: (next) => { qc.setQueryData(['games', 'room', roomId], next); setError(''); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : 'Không cập nhật được thiết lập.'),
  });
  const askLeave = () => Alert.alert('Rời phòng?', room?.status === 'IN_MATCH' ? 'Bạn sẽ rời ván đang chơi và giữ lại điểm đã đạt.' : 'Bạn có thể vào lại bằng mã phòng nếu phòng còn chỗ.', [{ text: 'Ở lại', style: 'cancel' }, { text: 'Rời phòng', style: 'destructive', onPress: () => leave.mutate() }]);
  const changeLives = (delta: number) => { if (!settings) return; const initialLives = Math.min(6, Math.max(3, settings.initialLives + delta)); update.mutate(rocket ? { initialLives, questionCount: settings.questionCount ?? 10, secondsPerQuestion: settings.secondsPerQuestion ?? 15 } : { initialLives, wordLimit: settings.wordLimit, timeEnabled: settings.timeEnabled }); };
  const changeRocketSettings = (patch: { questionCount?: number; secondsPerQuestion?: number }) => { if (!settings) return; update.mutate({ initialLives: settings.initialLives, questionCount: patch.questionCount ?? settings.questionCount ?? 10, secondsPerQuestion: patch.secondsPerQuestion ?? settings.secondsPerQuestion ?? 15 }); };

  return <View className="flex-1 bg-canvas"><ScrollView contentContainerClassName="px-5 pb-12 pt-3">
    <View className="flex-row items-center justify-between"><Pressable onPress={askLeave} accessibilityLabel="Rời phòng" className="h-11 w-11 items-center justify-center rounded-full bg-surface"><ArrowLeft size={20} color={colors.ink}/></Pressable><View className="flex-row items-center gap-1.5">{connected ? <Wifi size={17} color={colors.success}/> : <WifiOff size={17} color={colors.muted}/>}<Text className="text-xs text-muted">{connected ? 'Đã kết nối' : 'Đang kết nối…'}</Text></View></View>
    {query.isPending ? <View className="mt-12 items-center"><ActivityIndicator color={colors.accent}/><Text className="mt-3 text-sm text-muted">Đang tải phòng…</Text></View> : query.isError || !room ? <Card className="mt-8 border-b-0 bg-surface p-5"><Text weight="bold">Không tải được phòng chơi.</Text><Text className="mt-2 text-sm text-muted">{query.error?.message ?? 'Có thể phòng đã đóng hoặc mã không hợp lệ.'}</Text><Button className="mt-4" label="Thử lại" onPress={() => void query.refetch()}/></Card> : <>
      <View className="mt-6 flex-row items-center gap-2"><View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: rocket ? colors.warmSoft : colors.accentSoft }}>{rocket ? <Rocket size={21} color={colors.accentWarm}/> : <Users size={21} color={colors.accent}/>}</View><View><Text weight="bold" className="text-xs uppercase tracking-widest text-accent">SẢNH {rocket ? 'ROCKET' : 'WORDLY'}</Text><Text weight="black" className="mt-1 text-2xl">Phòng của bạn</Text></View></View>
      <Text className="mt-2 text-sm text-muted">Chia sẻ mã phòng để bạn bè tham gia.</Text>
      <Pressable accessibilityRole="button" onPress={() => void Share.share({ message: `Tham gia phòng ${rocket ? 'Rocket' : 'Wordly'} ${room.roomCode}` })} className="mt-5 items-center rounded-3xl px-5 py-6" style={{ backgroundColor: rocket ? colors.accentWarm : colors.accent }}><Text className="text-sm text-white/80">MÃ PHÒNG</Text><Text weight="black" className="mt-1 text-4xl tracking-[8px] text-white">{room.roomCode}</Text><View className="mt-3 flex-row items-center gap-2"><Copy size={16} color="white"/><Text weight="bold" className="text-sm text-white">Chia sẻ mã</Text></View></Pressable>
      <View className="mt-5 flex-row items-center justify-between"><Text weight="bold" className="text-lg">Người chơi</Text><Text className="text-sm text-muted">{room.members.filter((item) => item.status !== 'LEFT').length}/{room.maxPlayers}</Text></View>
      <View className="mt-3 gap-2">{room.members.filter((item) => item.status !== 'LEFT').map((item) => <View key={item.userId} className="min-h-[68px] flex-row items-center rounded-2xl border border-line bg-surface px-4"><View className="h-10 w-10 items-center justify-center rounded-full bg-accent-soft">{item.userId === room.hostUserId ? <Crown size={19} color={colors.accentWarm}/> : <Text weight="bold" className="text-accent">{item.displayName?.slice(0, 1).toUpperCase() ?? '?'}</Text>}</View><View className="ml-3 flex-1"><Text weight="bold" className="text-sm">{item.displayName ?? 'Người chơi'}{item.userId === user.data?.id ? ' (Bạn)' : ''}</Text><Text className="mt-1 text-xs text-muted">{item.userId === room.hostUserId ? 'Chủ phòng' : item.status === 'READY' ? 'Đã sẵn sàng' : 'Đang chờ'}</Text></View>{host && item.userId !== user.data?.id && room.status === 'WAITING' ? <Pressable accessibilityRole="button" accessibilityLabel={`Mời ${item.displayName} ra khỏi phòng`} onPress={() => Alert.alert('Mời khỏi phòng?', undefined, [{ text: 'Hủy', style: 'cancel' }, { text: 'Mời ra', style: 'destructive', onPress: () => void gameApi.kick(roomId, item.userId).then((next) => qc.setQueryData(['games', 'room', roomId], next)).catch((reason) => setError(reason.message)) }])} className="min-h-11 justify-center px-2"><Text className="text-xs text-danger">Mời ra</Text></Pressable> : null}</View>)}</View>

      {settings ? <Card className="mt-5 border-b-0 bg-surface p-4"><Text weight="bold" className="text-base">Thiết lập ván</Text>
        {rocket ? <><Text className="mt-2 text-sm text-muted">{settings.questionCount ?? 10} câu · {settings.secondsPerQuestion ?? 15} giây mỗi câu · {settings.initialLives} mạng</Text>{host && room.status === 'WAITING' ? <>
          <View className="mt-3 flex-row items-center justify-between"><Text className="text-sm">Số câu</Text><View className="flex-row items-center gap-3"><Pressable disabled={update.isPending || (settings.questionCount ?? 10) <= 5} onPress={() => changeRocketSettings({ questionCount: (settings.questionCount ?? 10) - 1 })} className="h-10 w-10 items-center justify-center rounded-xl bg-canvas"><Text weight="bold">−</Text></Pressable><Text weight="bold">{settings.questionCount ?? 10}</Text><Pressable disabled={update.isPending || (settings.questionCount ?? 10) >= 20} onPress={() => changeRocketSettings({ questionCount: (settings.questionCount ?? 10) + 1 })} className="h-10 w-10 items-center justify-center rounded-xl bg-canvas"><Text weight="bold">+</Text></Pressable></View></View>
          <View className="mt-3 flex-row items-center justify-between"><Text className="text-sm">Mạng mỗi người</Text><View className="flex-row items-center gap-3"><Pressable disabled={update.isPending || settings.initialLives <= 3} onPress={() => changeLives(-1)} className="h-10 w-10 items-center justify-center rounded-xl bg-canvas"><Text weight="bold">−</Text></Pressable><Text weight="bold">{settings.initialLives}</Text><Pressable disabled={update.isPending || settings.initialLives >= 6} onPress={() => changeLives(1)} className="h-10 w-10 items-center justify-center rounded-xl bg-canvas"><Text weight="bold">+</Text></Pressable></View></View>
          <Text weight="semibold" className="mb-2 mt-3 text-xs text-muted">Thời gian mỗi câu</Text><View className="flex-row gap-2">{[10, 15, 20].map((value) => <Pressable key={value} disabled={update.isPending} onPress={() => changeRocketSettings({ secondsPerQuestion: value })} className="min-h-10 flex-1 items-center justify-center rounded-xl" style={{ backgroundColor: settings.secondsPerQuestion === value ? colors.accentSoft : colors.canvas }}><Text weight="bold" className="text-xs" style={{ color: settings.secondsPerQuestion === value ? colors.accent : colors.muted }}>{value} giây</Text></Pressable>)}</View>
        </> : null}</> : <><Text className="mt-2 text-sm text-muted">{settings.playMode === 'ENDLESS' ? 'Vô hạn' : `${settings.wordLimit ?? '—'} từ`} · {settings.initialLives} mạng · {settings.timeEnabled ? 'Có giới hạn thời gian' : 'Không giới hạn giờ'}</Text>{host && room.status === 'WAITING' ? <>
          <View className="mt-3 flex-row items-center justify-between"><Text className="text-sm">Mạng</Text><View className="flex-row items-center gap-3"><Pressable disabled={update.isPending || settings.initialLives <= 3} onPress={() => changeLives(-1)} className="h-10 w-10 items-center justify-center rounded-xl bg-canvas"><Text weight="bold">−</Text></Pressable><Text weight="bold">{settings.initialLives}</Text><Pressable disabled={update.isPending || settings.initialLives >= 6} onPress={() => changeLives(1)} className="h-10 w-10 items-center justify-center rounded-xl bg-canvas"><Text weight="bold">+</Text></Pressable></View></View>
          <View className="mt-2 min-h-12 flex-row items-center justify-between"><Text className="text-sm">Giới hạn thời gian</Text><Switch disabled={update.isPending || room.playerMode === 'MULTIPLAYER'} value={settings.timeEnabled} onValueChange={(timeEnabled) => update.mutate({ initialLives: settings.initialLives, wordLimit: settings.wordLimit, timeEnabled })} trackColor={{ true: colors.accent }}/></View>
          {settings.playMode === 'FINITE' ? <View className="mt-2 flex-row items-center justify-between"><Text className="text-sm">Số từ</Text><TextInput accessibilityLabel="Số từ mỗi ván" keyboardType="number-pad" defaultValue={String(settings.wordLimit ?? 10)} onEndEditing={({ nativeEvent }) => { const wordLimit = Number(nativeEvent.text); if (Number.isInteger(wordLimit) && wordLimit >= 5 && wordLimit !== settings.wordLimit) update.mutate({ initialLives: settings.initialLives, wordLimit, timeEnabled: settings.timeEnabled }); }} className="h-10 w-20 rounded-xl border border-line bg-canvas text-center text-ink"/></View> : null}
        </> : null}</>}</Card> : null}

      {error ? <Text accessibilityRole="alert" className="mt-4 text-sm text-danger">{error}</Text> : null}
      {room.status === 'IN_MATCH' && room.activeMatchId ? <Button className="mt-5" label="Ván đã bắt đầu · Tiếp tục" onPress={() => router.replace(matchRoute(room, room.activeMatchId!))}/> : <>
        <Button className="mt-5" loading={ready.isPending} label={member?.status === 'READY' ? 'Hủy sẵn sàng' : 'Tôi đã sẵn sàng'} variant={member?.status === 'READY' ? 'secondary' : 'primary'} disabled={!member || ready.isPending || room.status !== 'WAITING'} onPress={() => ready.mutate()}/>
        {host ? <Button className="mt-3" label={start.isPending ? 'Đang bắt đầu…' : 'Bắt đầu ván'} loading={start.isPending} disabled={!room.canStart || start.isPending} onPress={() => start.mutate()}/> : <Text className="mt-3 text-center text-sm text-muted">Chủ phòng bắt đầu khi mọi người đã sẵn sàng.</Text>}
      </>}
      <Pressable onPress={askLeave} disabled={leave.isPending} className="mt-5 min-h-11 flex-row items-center justify-center gap-2"><LogOut size={17} color={colors.danger}/><Text weight="bold" className="text-sm text-danger">Rời {room.status === 'IN_MATCH' ? 'ván' : 'phòng'}</Text></Pressable>
    </>}
  </ScrollView></View>;
}
