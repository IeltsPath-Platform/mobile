import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ArrowLeft, Gamepad2, Users, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { gameApi } from '@/src/features/games/api';
import { isWordlyAvailable, type PlayerMode, type PlayMode } from '@/src/features/games/types';
import { colors } from '@/src/theme';

export default function GameCatalogScreen() {
  const router = useRouter();
  const catalog = useQuery({ queryKey: ['games', 'catalog'], queryFn: gameApi.catalog, retry: 1 });
  const [mode, setMode] = useState<PlayerMode>('SOLO'); const [playMode, setPlayMode] = useState<PlayMode>('FINITE'); const [lives, setLives] = useState(5); const [timeEnabled, setTimeEnabled] = useState(true); const [wordLimit, setWordLimit] = useState('10'); const [code, setCode] = useState(''); const [error, setError] = useState('');
  const create = useMutation({ mutationFn: async () => {
    const parsedLimit = playMode === 'ENDLESS' ? null : Number(wordLimit);
    if (parsedLimit !== null && (!Number.isInteger(parsedLimit) || parsedLimit < 5)) throw new Error('Số từ phải là số nguyên từ 5 trở lên.');
    const room = await gameApi.create({ playerMode: mode, playMode, initialLives: lives, wordLimit: parsedLimit, timeEnabled });
    if (mode === 'SOLO') {
      await gameApi.ready(room.id, true);
      try { return { room, match: await gameApi.start(room.id) }; }
      catch (error) { const latest = await gameApi.getRoom(room.id); if (latest.status === 'IN_MATCH' && latest.activeMatchId) return { room: latest, match: await gameApi.getMatch(latest.activeMatchId) }; throw error; }
    }
    return { room, match: null };
  }, onSuccess: ({ room, match }) => router.push(match ? `/games/matches/${match.matchId}` as never : `/games/rooms/${room.id}` as never), onError: (reason) => setError(reason instanceof Error ? reason.message : 'Không tạo được phòng.') });
  const join = useMutation({ mutationFn: () => { const normalized = code.trim().toUpperCase(); if (!/^[A-Z0-9]{6}$/.test(normalized)) throw new Error('Mã phòng cần đúng 6 chữ hoặc số.'); return gameApi.join(normalized); }, onSuccess: (room) => router.push(`/games/rooms/${room.id}` as never), onError: (reason) => setError(reason instanceof Error ? reason.message : 'Không vào được phòng.') });
  const available = catalog.data?.games.find(isWordlyAvailable);
  return <View className="flex-1 bg-canvas"><ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-12 pt-3">
    <Pressable accessibilityRole="button" onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full bg-white"><ArrowLeft size={20} color={colors.ink} /></Pressable>
    <View className="mt-5"><Text weight="bold" className="text-xs uppercase tracking-widest text-accent-deep">Học qua trò chơi</Text><Text weight="black" className="mt-1 text-3xl">Mỗi từ mới, một thử thách</Text><Text className="mt-2 text-sm leading-6 text-muted">Luyện vốn từ và chơi cùng bạn bè trong Wordly.</Text></View>
    {catalog.isPending ? <ActivityIndicator className="py-10" color={colors.accent} /> : catalog.isError ? <View className="mt-5 rounded-3xl border border-line bg-white p-5"><Text accessibilityRole="alert">{catalog.error.message}</Text><Button className="mt-4" label="Thử lại" onPress={() => void catalog.refetch()} /></View> : <View className="mt-5 rounded-3xl border border-line bg-white p-5"><View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft"><Gamepad2 size={28} color={colors.accent} /></View><Text weight="black" className="mt-4 text-2xl">{available?.name ?? 'Wordly'}</Text><Text className="mt-2 text-sm leading-6 text-muted">{available?.description ?? 'Đoán từ vựng theo gợi ý nghĩa.'}</Text>{available ? <View className="mt-4 flex-row items-center gap-2"><View className="h-2.5 w-2.5 rounded-full bg-success"/><Text weight="bold" className="text-xs text-success">Sẵn sàng</Text></View> : <Text className="mt-4 text-sm text-muted">Sắp ra mắt</Text>}</View>}
    <Text weight="bold" className="mt-6 text-lg">Thiết lập ván chơi</Text>
    <View className="mt-3 rounded-3xl border border-line bg-white p-4">
      <View className="flex-row gap-3">{(['SOLO','MULTIPLAYER'] as PlayerMode[]).map((item) => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ selected: mode === item }} onPress={() => setMode(item)} className="min-h-16 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border" style={{ borderColor: mode === item ? colors.accent : colors.line, backgroundColor: mode === item ? colors.accentSoft : colors.surface }}><ModeIcon mode={item}/><Text weight="bold" className="text-sm">{item === 'SOLO' ? 'Chơi đơn' : 'Cùng bạn bè'}</Text></Pressable>)}</View>
      <View className="mt-4 flex-row gap-3">{(['FINITE','ENDLESS'] as PlayMode[]).map((item) => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ selected: playMode === item }} onPress={() => setPlayMode(item)} className="min-h-11 flex-1 items-center justify-center rounded-xl" style={{ backgroundColor: playMode === item ? colors.accentSoft : colors.canvas }}><Text weight="bold" className="text-sm">{item === 'FINITE' ? 'Số từ' : 'Vô hạn'}</Text></Pressable>)}</View>
      {playMode === 'FINITE' ? <View className="mt-3 flex-row items-center justify-between"><Text className="text-sm">Số từ (tối thiểu 5)</Text><TextInput value={wordLimit} onChangeText={setWordLimit} keyboardType="number-pad" className="h-11 w-24 rounded-xl border border-line px-3 text-center text-ink" accessibilityLabel="Số từ trong ván" /></View> : null}
      <View className="mt-4 flex-row items-center justify-between"><Text className="text-sm">Số mạng</Text><View className="flex-row items-center gap-3"><Pressable accessibilityLabel="Giảm số mạng" onPress={() => setLives((n) => Math.max(3, n - 1))} className="h-11 w-11 items-center justify-center rounded-xl bg-canvas"><Text weight="bold">−</Text></Pressable><Text weight="black" className="w-5 text-center">{lives}</Text><Pressable accessibilityLabel="Tăng số mạng" onPress={() => setLives((n) => Math.min(6, n + 1))} className="h-11 w-11 items-center justify-center rounded-xl bg-canvas"><Text weight="bold">+</Text></Pressable></View></View>
      <View className="mt-2 min-h-12 flex-row items-center justify-between"><Text className="text-sm">Giới hạn thời gian mỗi từ</Text><Switch value={timeEnabled} onValueChange={setTimeEnabled} trackColor={{ true: colors.accent }} accessibilityLabel="Bật giới hạn thời gian" /></View>
      {error ? <Text accessibilityRole="alert" className="mt-3 text-sm text-danger">{error}</Text> : null}
      <Button className="mt-4" label={create.isPending ? 'Đang tạo…' : `Bắt đầu ${mode === 'SOLO' ? 'chơi đơn' : 'tạo phòng'}`} loading={create.isPending} disabled={!available || create.isPending} onPress={() => { setError(''); create.mutate(); }} />
    </View>
    <View className="mt-5 rounded-3xl border border-line bg-white p-4"><View className="flex-row items-center gap-2"><Users size={19} color={colors.accent} /><Text weight="bold" className="text-base">Tham gia phòng bạn bè</Text></View><Text className="mt-2 text-sm text-muted">Nhập mã phòng 6 ký tự để vào sảnh chờ.</Text><TextInput value={code} onChangeText={(value) => { setCode(value.toUpperCase().replace(/[^A-Z0-9]/g,'')); setError(''); }} autoCapitalize="characters" maxLength={6} placeholder="AB7K2Q" className="mt-3 h-12 rounded-xl border border-line px-4 text-center text-lg tracking-widest text-ink" accessibilityLabel="Mã phòng"/><Button className="mt-3" variant="secondary" label={join.isPending ? 'Đang vào…' : 'Vào phòng'} loading={join.isPending} onPress={() => { setError(''); join.mutate(); }} /></View>
  </ScrollView></View>;
}
function ModeIcon({ mode }: { mode: PlayerMode }) { const Icon = mode === 'SOLO' ? UserRound : Users; return <Icon size={17} color={colors.accent}/>; }
