import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, Wifi, WifiOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { gameApi } from '@/src/features/games/api';
import { gameErrorMessage } from '@/src/features/games/errors';
import { GAME_META, GAMES_HOME, gameTone, matchRoute, resultRoute, toGameKind } from '@/src/features/games/game-meta';
import { MemberRow, RoomCodeCard, RoomSettingsCard } from '@/src/features/games/room/room-parts';
import type { GameEvent, GameRoom } from '@/src/features/games/types';
import { useGameSocket } from '@/src/features/games/use-game-socket';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

const messageOf = (reason: unknown, fallback: string) => (reason instanceof Error ? reason.message : fallback);

export default function GameRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const user = useCurrentUser();
  const [error, setError] = useState('');
  const roomKey = ['games', 'room', roomId];

  const query = useQuery({
    queryKey: roomKey,
    queryFn: ({ signal }) => gameApi.getRoom(roomId, signal),
    enabled: Boolean(roomId),
    refetchInterval: 15_000,
    retry: 1,
  });
  const room = query.data;
  const kind = toGameKind(room?.gameType);

  const onEvent = useCallback(
    (event: GameEvent) => {
      if (event.type === 'ROOM_CLOSED' || event.type === 'PLAYER_KICKED') setError(event.message ?? 'Phòng chơi đã kết thúc.');
      if (event.room) qc.setQueryData(roomKey, event.room);
      const live = qc.getQueryData<GameRoom>(roomKey);
      if (event.type === 'MATCH_STARTED' && event.match && live) {
        router.replace(matchRoute(live.gameType, event.match.matchId));
      }
      const needsSnapshot = ['MATCH_STARTED', 'MEMBER_LEFT', 'ROOM_CLOSED', 'PLAYER_KICKED'].includes(event.type) && !event.room;
      if (needsSnapshot) void qc.invalidateQueries({ queryKey: roomKey });
    },
    // roomKey is derived from roomId only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qc, roomId, router],
  );
  const connected = useGameSocket(roomId || null, null, onEvent);

  const me = room?.members.find((item) => item.userId === user.data?.id);
  const isHost = room?.hostUserId === user.data?.id;
  const waiting = room?.status === 'WAITING';
  const members = room?.members.filter((item) => item.status !== 'LEFT') ?? [];

  const ready = useMutation({
    mutationFn: () => gameApi.ready(roomId, me?.status !== 'READY'),
    onSuccess: (next) => {
      qc.setQueryData(roomKey, next);
      setError('');
      haptics.tap();
    },
    onError: (reason) => {
      haptics.error();
      setError(messageOf(reason, 'Không cập nhật được trạng thái.'));
    },
  });

  const start = useMutation({
    mutationFn: () => gameApi.start(roomId),
    onSuccess: (match) => {
      haptics.success();
      if (room) router.replace(matchRoute(room.gameType, match.matchId));
    },
    onError: async (reason) => {
      const latest = await gameApi.getRoom(roomId).catch(() => null);
      if (latest) qc.setQueryData(roomKey, latest);
      haptics.error();
      setError(gameErrorMessage(reason));
    },
  });

  const leave = useMutation({
    mutationFn: async () => {
      if (room?.activeMatchId && room.status === 'IN_MATCH') {
        const response = await gameApi.leaveMatch(room.activeMatchId);
        return { matchId: room.activeMatchId, resultAvailable: response.resultAvailable };
      }
      await gameApi.leaveRoom(roomId);
      return null;
    },
    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: ['games'] });
      if (result?.resultAvailable) router.replace(resultRoute(result.matchId, kind));
      else router.replace(GAMES_HOME);
    },
    onError: (reason) => setError(messageOf(reason, 'Không rời được phòng.')),
  });

  const update = useMutation({
    mutationFn: (body: Parameters<typeof gameApi.settings>[1]) =>
      gameApi.settings(roomId, { ...body, cefrLevel: room?.settings?.cefrLevel, topicId: room?.settings?.topicId }),
    onSuccess: (next) => {
      qc.setQueryData(roomKey, next);
      setError('');
    },
    onError: (reason) => setError(messageOf(reason, 'Không cập nhật được thiết lập.')),
  });

  const kick = useCallback(
    (userId: string, name: string | null) =>
      Alert.alert(`Mời ${name ?? 'người chơi'} ra khỏi phòng?`, undefined, [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Mời ra',
          style: 'destructive',
          onPress: () => {
            gameApi
              .kick(roomId, userId)
              .then((next) => qc.setQueryData(roomKey, next))
              .catch((reason) => {
                haptics.error();
                setError(gameErrorMessage(reason));
              });
          },
        },
      ]),
    // roomKey is derived from roomId only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qc, roomId],
  );

  const askLeave = () =>
    Alert.alert('Rời phòng?', room?.status === 'IN_MATCH' ? 'Bạn sẽ rời ván đang chơi và giữ lại điểm đã đạt.' : 'Bạn có thể vào lại bằng mã phòng nếu phòng còn chỗ.', [
      { text: 'Ở lại', style: 'cancel' },
      { text: 'Rời phòng', style: 'destructive', onPress: () => leave.mutate() },
    ]);

  const tone = gameTone(kind);
  const inMatch = room?.status === 'IN_MATCH' && room.activeMatchId;

  return (
    <View className="flex-1 bg-canvas">
      <View className="flex-row items-center justify-between px-4 pb-2 pt-1">
        <BackButton onBack={askLeave} label="Rời phòng" />
        <Text weight="black" className="text-base">Sảnh {GAME_META[kind].name}</Text>
        <View className="h-11 w-11 items-center justify-center" accessibilityLabel={connected ? 'Đã kết nối' : 'Đang kết nối'}>
          {connected ? <Wifi size={18} color={colors.success} /> : <WifiOff size={18} color={colors.muted} />}
        </View>
      </View>

      {query.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
          <Text className="mt-3 text-sm text-muted">Đang tải phòng…</Text>
        </View>
      ) : query.isError || !room ? (
        <View className="m-4 rounded-3xl border border-line bg-surface p-5">
          <Text weight="bold">Không tải được phòng chơi.</Text>
          <Text className="mt-2 text-sm text-muted">{query.error?.message ?? 'Có thể phòng đã đóng hoặc mã không hợp lệ.'}</Text>
          <Button className="mt-4" label="Thử lại" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 16 }}
            refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.accent} />}
          >
            <RoomCodeCard kind={kind} code={room.roomCode} />

            <View>
              <View className="flex-row items-center justify-between">
                <Text weight="black" className="text-base">Người chơi</Text>
                <View className="rounded-full px-3 py-1" style={{ backgroundColor: tone.soft }}>
                  <Text weight="bold" className="text-xs" style={{ color: tone.solid }}>{members.length}/{room.maxPlayers}</Text>
                </View>
              </View>
              <View className="mt-3 gap-2">
                {members.map((item) => (
                  <MemberRow
                    key={item.userId}
                    member={item}
                    hostUserId={room.hostUserId}
                    isMe={item.userId === user.data?.id}
                    canKick={isHost === true && waiting && item.userId !== user.data?.id}
                    onKick={() => kick(item.userId, item.displayName)}
                  />
                ))}
              </View>
            </View>

            {room.settings ? (
              <RoomSettingsCard
                room={room}
                settings={room.settings}
                editable={isHost === true && waiting}
                pending={update.isPending}
                onChange={(patch) => update.mutate(patch)}
                onInvalid={setError}
              />
            ) : null}

            {error ? (
              <Text accessibilityRole="alert" className="rounded-xl p-3 text-sm text-danger" style={{ backgroundColor: colors.dangerSoft }}>
                {error}
              </Text>
            ) : null}
          </ScrollView>

          <View className="gap-2 border-t border-line bg-surface px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
            {inMatch ? (
              <Button label="Ván đã bắt đầu · Tiếp tục" onPress={() => router.replace(matchRoute(room.gameType, room.activeMatchId!))} />
            ) : (
              <>
                <Button
                  label={me?.status === 'READY' ? 'Hủy sẵn sàng' : 'Tôi đã sẵn sàng'}
                  variant={me?.status === 'READY' ? 'secondary' : 'primary'}
                  loading={ready.isPending}
                  disabled={!me || !waiting}
                  onPress={() => ready.mutate()}
                />
                {isHost ? (
                  <Button label="Bắt đầu ván" loading={start.isPending} loadingLabel="Đang bắt đầu…" disabled={!room.canStart} onPress={() => start.mutate()} />
                ) : (
                  <Text className="text-center text-xs text-muted">Chủ phòng sẽ bắt đầu khi mọi người đã sẵn sàng.</Text>
                )}
              </>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={askLeave}
              disabled={leave.isPending}
              className="min-h-11 flex-row items-center justify-center gap-2"
            >
              <LogOut size={16} color={colors.danger} />
              <Text weight="bold" className="text-sm text-danger">Rời {room.status === 'IN_MATCH' ? 'ván' : 'phòng'}</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
