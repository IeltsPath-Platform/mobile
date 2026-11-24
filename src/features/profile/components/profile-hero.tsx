import { Image } from 'expo-image';
import { CalendarDays, ChevronRight, PenLine, UsersRound } from 'lucide-react-native';
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

/** Identity row (avatar beside name and details) followed by the followers row. */
export function ProfileHero({
  name,
  email,
  band,
  createdAt,
  avatarUrl,
  followers,
  onEdit,
  onOpenCommunity,
}: {
  name: string;
  email: string;
  band: string | null;
  createdAt?: string;
  avatarUrl?: string | null;
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Người theo dõi: ${followers}. Xem hồ sơ cộng đồng`}
        onPress={onOpenCommunity}
        className="mt-4 min-h-12 flex-row items-center gap-3 rounded-2xl px-3 active:opacity-70"
        style={{ backgroundColor: `${colors.social}1f` }}>
        <View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: colors.social }}>
          <UsersRound size={16} color="#ffffff" />
        </View>
        <Text weight="bold" className="flex-1 text-sm text-ink">Người theo dõi</Text>
        <Text weight="black" className="text-base text-ink">{followers}</Text>
        <ChevronRight size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}
