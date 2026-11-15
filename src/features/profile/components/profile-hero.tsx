import { Image } from 'expo-image';
import { CalendarDays, Flame, PenLine, UsersRound, Zap } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

const OWL = require('@/assets/images/owl/hero-cheer.webp');

function joinedLabel(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `Tham gia ${date.getMonth() + 1}/${date.getFullYear()}`;
}

type StatProps = {
  label: string;
  value: string | number;
  color: string;
  icon: typeof Flame;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** One coloured stat tile; the tint is the stat colour at low opacity so it follows light/dark. */
function StatTile({ label, value, color, icon: Icon, onPress, accessibilityLabel }: StatProps) {
  const body = (
    <View className="flex-1 rounded-2xl px-2.5 py-3" style={{ backgroundColor: `${color}1f` }}>
      <View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: color }}>
        <Icon size={16} color="#ffffff" fill={Icon === UsersRound ? 'transparent' : '#ffffff'} />
      </View>
      <Text weight="black" className="mt-2.5 text-xl leading-6 text-ink" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      {/* Shrinks instead of truncating so "Người theo dõi" fits on narrow phones. */}
      <Text className="text-[11px] text-muted" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {label}
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      className="flex-1 active:opacity-70">
      {body}
    </Pressable>
  );
}

/** Identity row (avatar beside name and details) followed by three stat tiles. */
export function ProfileHero({
  name,
  email,
  band,
  createdAt,
  avatarUrl,
  streak,
  xp,
  followers,
  onEdit,
  onOpenCommunity,
}: {
  name: string;
  email: string;
  band: string | null;
  createdAt?: string;
  avatarUrl?: string | null;
  streak: string | number;
  xp: string | number;
  followers: string | number;
  onEdit: () => void;
  onOpenCommunity: () => void;
}) {
  useTheme();
  const joined = joinedLabel(createdAt);
  return (
    <View className="rounded-[26px] border bg-surface p-4" style={{ borderColor: colors.line }}>
      <View className="flex-row items-center gap-4">
        <View>
          <View
            className="h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-[28px]"
            style={{ backgroundColor: colors.listeningSoft, borderWidth: 3, borderColor: colors.accent }}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} accessibilityLabel="Avatar học viên" contentFit="cover" style={{ width: '100%', height: '100%' }} />
            ) : (
              <Image source={OWL} accessibilityLabel="Cú IELTSPath" contentFit="contain" style={{ width: 74, height: 74 }} />
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chỉnh sửa hồ sơ"
            onPress={onEdit}
            hitSlop={8}
            className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.surface }}>
            <PenLine size={13} color="#ffffff" />
          </Pressable>
        </View>

        <View className="flex-1">
          <Text weight="black" className="text-xl leading-7 text-ink" numberOfLines={1}>
            {name}
          </Text>
          <Text className="text-xs text-muted" numberOfLines={1}>
            {email}
          </Text>
          <View className="mt-2 flex-row flex-wrap items-center gap-1.5">
            {band ? (
              <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: colors.accent }}>
                <Text weight="black" className="text-[11px]" style={{ color: '#ffffff' }}>
                  {band}
                </Text>
              </View>
            ) : null}
            {joined ? (
              <View className="flex-row items-center gap-1 rounded-full px-2.5 py-0.5" style={{ backgroundColor: colors.canvas }}>
                <CalendarDays size={12} color={colors.muted} />
                <Text weight="bold" className="text-[11px] text-muted">
                  {joined}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View className="mt-4 flex-row gap-2">
        <StatTile label="Ngày liên tiếp" value={streak} color={colors.flame} icon={Flame} />
        <StatTile label="Tổng XP" value={xp} color={colors.coin} icon={Zap} />
        <StatTile
          label="Người theo dõi"
          value={followers}
          color={colors.social}
          icon={UsersRound}
          onPress={onOpenCommunity}
          accessibilityLabel="Xem hồ sơ cộng đồng và người theo dõi"
        />
      </View>
    </View>
  );
}
