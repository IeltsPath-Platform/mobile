import { Pressable, Share, Switch, TextInput, View } from 'react-native';
import { Check, Crown, Share2 } from 'lucide-react-native';

import { Stepper } from '@/src/components/ui/stepper';
import { Text } from '@/src/components/ui/text';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

import { GAME_META, gameTone, type GameKind } from '../game-meta';
import type { GameMember, GameRoom, RoomSettings } from '../types';

export function RoomCodeCard({ kind, code }: { kind: GameKind; code: string }) {
  const tone = gameTone(kind);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Chia sẻ mã phòng ${code}`}
      onPress={() => {
        haptics.tap();
        void Share.share({ message: `Vào phòng ${GAME_META[kind].name} của mình bằng mã ${code} nhé!` });
      }}
      className="items-center rounded-3xl px-5 py-6 active:opacity-90"
      style={{ backgroundColor: tone.solid, borderBottomWidth: 5, borderBottomColor: 'rgba(0,0,0,0.18)' }}
    >
      <Text weight="bold" className="text-xs tracking-widest" style={{ color: colors.onAccent, opacity: 0.85 }}>
        MÃ PHÒNG
      </Text>
      <Text weight="black" className="mt-1 text-5xl tracking-[8px]" style={{ color: colors.onAccent }}>
        {code}
      </Text>
      <View className="mt-3 flex-row items-center gap-2 rounded-full px-4 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
        <Share2 size={15} color={colors.onAccent} />
        <Text weight="bold" className="text-sm" style={{ color: colors.onAccent }}>Chia sẻ cho bạn bè</Text>
      </View>
    </Pressable>
  );
}

export function MemberRow({
  member,
  hostUserId,
  isMe,
  canKick,
  onKick,
}: {
  member: GameMember;
  hostUserId: string;
  isMe: boolean;
  canKick: boolean;
  onKick: () => void;
}) {
  const isHost = member.userId === hostUserId;
  const ready = member.status === 'READY';
  return (
    <View className="min-h-[64px] flex-row items-center rounded-2xl border border-line bg-surface px-4">
      <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: isHost ? colors.warmSoft : colors.accentSoft }}>
        {isHost ? (
          <Crown size={20} color={colors.accentWarm} />
        ) : (
          <Text weight="black" className="text-accent">{member.displayName?.slice(0, 1).toUpperCase() ?? '?'}</Text>
        )}
      </View>
      <View className="ml-3 flex-1">
        <Text weight="bold" numberOfLines={1}>
          {member.displayName ?? 'Người chơi'}
          {isMe ? ' (Bạn)' : ''}
        </Text>
        <Text className="text-xs" style={{ color: ready ? colors.success : colors.muted }}>
          {isHost ? (ready ? 'Chủ phòng · Sẵn sàng' : 'Chủ phòng') : ready ? 'Đã sẵn sàng' : 'Đang chờ'}
        </Text>
      </View>
      {ready ? <Check size={20} color={colors.success} strokeWidth={3} /> : null}
      {canKick ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mời ${member.displayName ?? 'người chơi'} ra khỏi phòng`}
          onPress={onKick}
          className="ml-2 min-h-11 justify-center px-2"
        >
          <Text weight="semibold" className="text-xs text-danger">Mời ra</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type SettingsPatch = {
  initialLives: number;
  wordLimit?: number | null;
  timeEnabled?: boolean;
  questionCount?: number | null;
  secondsPerQuestion?: number | null;
};

/** Read-only summary for guests; steppers for the host while the room is waiting. */
export function RoomSettingsCard({
  room,
  settings,
  editable,
  pending,
  onChange,
  onInvalid,
}: {
  room: GameRoom;
  settings: RoomSettings;
  editable: boolean;
  pending: boolean;
  onChange: (patch: SettingsPatch) => void;
  onInvalid: (message: string) => void;
}) {
  const rocket = room.gameType === 'ROCKET';
  const level = settings.cefrLevel ?? 'Mọi cấp độ';
  const topic = settings.topicId ? 'Chủ đề đã chọn' : 'Mọi chủ đề';
  const base = { initialLives: settings.initialLives };
  const rocketBase = {
    ...base,
    questionCount: settings.questionCount ?? 10,
    secondsPerQuestion: settings.secondsPerQuestion ?? 15,
  };
  const wordlyBase = { ...base, wordLimit: settings.wordLimit, timeEnabled: settings.timeEnabled };

  const summary = rocket
    ? `${settings.questionCount ?? 10} câu · ${settings.secondsPerQuestion ?? 15} giây/câu · ${settings.initialLives} mạng`
    : `${settings.playMode === 'ENDLESS' ? 'Vô hạn' : `${settings.wordLimit ?? '—'} từ`} · ${settings.initialLives} mạng · ${settings.timeEnabled ? 'Có giới hạn giờ' : 'Không giới hạn giờ'}`;

  return (
    <View className="rounded-3xl border border-line bg-surface p-4">
      <Text weight="black" className="text-base">Thiết lập ván</Text>
      <Text className="mt-1 text-xs text-muted">{level} · {topic}</Text>
      <Text className="mt-2 text-sm">{summary}</Text>

      {editable ? (
        <>
          {rocket ? (
            <>
              <Stepper label="Số câu" unit="câu" value={rocketBase.questionCount} min={room.playerMode === 'SOLO' ? 3 : 5} max={20} disabled={pending} onChange={(questionCount) => onChange({ ...rocketBase, questionCount })} />
              <Stepper label="Mạng mỗi người" unit="mạng" value={settings.initialLives} min={3} max={6} disabled={pending} onChange={(initialLives) => onChange({ ...rocketBase, initialLives })} />
              <Text weight="semibold" className="mb-2 mt-4 text-xs text-muted">Thời gian mỗi câu</Text>
              <View className="flex-row gap-2">
                {[10, 15, 20].map((value) => {
                  const selected = rocketBase.secondsPerQuestion === value;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      disabled={pending}
                      onPress={() => onChange({ ...rocketBase, secondsPerQuestion: value })}
                      className="min-h-11 flex-1 items-center justify-center rounded-xl"
                      style={{ backgroundColor: selected ? colors.accentSoft : colors.canvas }}
                    >
                      <Text weight="bold" className="text-xs" style={{ color: selected ? colors.accent : colors.muted }}>{value} giây</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <Stepper label="Mạng" unit="mạng" value={settings.initialLives} min={3} max={6} disabled={pending} onChange={(initialLives) => onChange({ ...wordlyBase, initialLives })} />
              <View className="mt-2 min-h-12 flex-row items-center justify-between">
                <Text className="text-sm">Giới hạn thời gian</Text>
                <Switch
                  accessibilityLabel="Bật giới hạn thời gian"
                  disabled={pending || room.playerMode === 'MULTIPLAYER'}
                  value={settings.timeEnabled}
                  onValueChange={(timeEnabled) => onChange({ ...wordlyBase, timeEnabled })}
                  trackColor={{ true: colors.accent }}
                />
              </View>
              {settings.playMode === 'FINITE' ? (
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-sm">Số từ (tối thiểu 5)</Text>
                  <TextInput
                    accessibilityLabel="Số từ mỗi ván"
                    keyboardType="number-pad"
                    defaultValue={String(settings.wordLimit ?? 10)}
                    onEndEditing={({ nativeEvent }) => {
                      const wordLimit = Number(nativeEvent.text);
                      if (!Number.isInteger(wordLimit) || wordLimit < 5) {
                        haptics.warning();
                        onInvalid('Số từ tối thiểu là 5.');
                        return;
                      }
                      if (wordLimit !== settings.wordLimit) onChange({ ...wordlyBase, wordLimit });
                    }}
                    className="h-11 w-20 rounded-xl border border-line bg-canvas text-center text-ink"
                  />
                </View>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </View>
  );
}
