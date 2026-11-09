import { Alert, Pressable, TextInput, View } from 'react-native';
import { Users } from 'lucide-react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { GAME_META, gameTone, matchRoute, roomRoute, type GameKind } from '../game-meta';
import { type GameSetup } from './use-game-setup';


function statusPill(status: string) {
  if (status === 'AVAILABLE') return { label: 'Sẵn sàng', color: colors.success, background: colors.successSoft };
  if (status === 'MAINTENANCE') return { label: 'Đang bảo trì', color: colors.accentWarm, background: colors.warmSoft };
  if (status === 'COMING_SOON') return { label: 'Sắp ra mắt', color: colors.muted, background: colors.surfaceTint };
  return { label: 'Tạm đóng', color: colors.muted, background: colors.surfaceTint };
}

export function ActiveGameBanner({ setup }: { setup: GameSetup }) {
  const game = setup.active.data;
  if (!setup.enabled || !game) return null;
  const kind: GameKind = game.gameType;
  const tone = gameTone(kind);
  const waiting = game.roomStatus === 'WAITING';
  const route = game.matchId ? matchRoute(kind, game.matchId) : roomRoute(game.roomId);
  const { Icon, name } = GAME_META[kind];
  return (
    <View className="mt-4 rounded-3xl p-4" style={{ backgroundColor: tone.soft, borderWidth: 2, borderBottomWidth: 4, borderColor: tone.solid }}>
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: tone.solid }}>
          <Icon size={24} color="#ffffff" />
        </View>
        <View className="flex-1">
          <Text weight="black">Bạn đang có ván {name}</Text>
          <Text className="mt-0.5 text-xs text-muted">{waiting ? `Phòng ${game.roomCode} đang chờ` : 'Ván chơi đang diễn ra'}</Text>
        </View>
      </View>
      <View className="mt-3 flex-row gap-2">
        <Button className="flex-1" label={waiting ? 'Vào phòng' : 'Chơi tiếp'} onPress={() => setup.router.push(route)} />
        <Button
          variant="secondary"
          label="Rời ván"
          loading={setup.leaveActive.isPending}
          onPress={() =>
            Alert.alert('Rời ván đang chơi?', 'Bạn sẽ không thể tiếp tục ván hiện tại.', [
              { text: 'Ở lại', style: 'cancel' },
              { text: 'Rời ván', style: 'destructive', onPress: () => setup.leaveActive.mutate() },
            ])
          }
        />
      </View>
    </View>
  );
}

export function GamePicker({ setup }: { setup: GameSetup }) {
  const items = setup.games.filter((item) => item.gameType === 'WORDLY' || item.gameType === 'ROCKET');
  return (
    <View className="mt-5 gap-3">
      <Text className="text-sm text-muted">Chọn một trò để bắt đầu.</Text>
      {items.map((item) => {
        const kind: GameKind = item.gameType === 'ROCKET' ? 'ROCKET' : 'WORDLY';
        const canPlay = setup.isGameAvailable(item, kind);
        const tone = gameTone(kind);
        const pill = statusPill(item.status);
        const { Icon } = GAME_META[kind];
        return (
          <Pressable
            key={item.gameType}
            disabled={!canPlay}
            onPress={() => setup.selectKind(kind)}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}. ${item.description}`}
            accessibilityState={{ disabled: !canPlay }}
            className="overflow-hidden rounded-3xl active:translate-y-0.5"
            style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: canPlay ? tone.solid : colors.line, borderBottomColor: canPlay ? tone.solid : colors.edge, backgroundColor: colors.surface, opacity: canPlay ? 1 : 0.6 }}
          >
            <View style={{ backgroundColor: canPlay ? tone.solid : colors.disabledFill, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}>
              <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={30} color={canPlay ? tone.solid : colors.muted} />
              </View>
              <Text weight="black" className="flex-1 text-2xl" style={{ color: canPlay ? '#ffffff' : colors.muted }}>{item.name}</Text>
            </View>
            <View className="p-4">
              <Text className="text-sm leading-5 text-muted">{item.description}</Text>
              {!canPlay ? (
                <View className="mt-3 self-start rounded-full px-2.5 py-1" style={{ backgroundColor: pill.background }}>
                  <Text weight="bold" className="text-[11px]" style={{ color: pill.color }}>{pill.label}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function JoinRoomCard({ setup }: { setup: GameSetup }) {
  return (
    <View className="mt-6 rounded-3xl bg-surface p-4" style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderBottomColor: colors.edge }}>
      <View className="flex-row items-center gap-2">
        <Users size={19} color={colors.accent} />
        <Text weight="black" className="text-base">Có mã phòng của bạn bè?</Text>
      </View>
      <View className="mt-3 flex-row items-center gap-2">
        <TextInput
          value={setup.code}
          onChangeText={setup.setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          placeholder="AB7K2Q"
          placeholderTextColor={colors.muted}
          returnKeyType="go"
          onSubmitEditing={() => {
            if (setup.enabled && setup.code.length === 6 && !setup.active.data && !setup.join.isPending) {
              setup.clearError();
              setup.join.mutate();
            }
          }}
          className="h-14 flex-1 rounded-2xl border-2 border-line bg-canvas px-4 text-center text-xl tracking-widest text-ink"
          accessibilityLabel="Mã phòng"
        />
        <Button
          variant="secondary"
          label="Vào"
          loading={setup.join.isPending}
          disabled={!setup.enabled || setup.code.length !== 6 || Boolean(setup.active.data)}
          onPress={() => {
            setup.clearError();
            setup.join.mutate();
          }}
        />
      </View>
    </View>
  );
}
