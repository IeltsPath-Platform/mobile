import { Image } from 'expo-image';
import { Camera, Flag, Flame, UsersRound, Zap } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

const OWL = require('@/assets/images/owl/hero-cheer.webp');
const STARS = [
  { top: 18, left: 28, size: 4 },
  { top: 52, left: 96, size: 3 },
  { top: 30, left: 250, size: 5 },
  { top: 84, left: 310, size: 3 },
  { top: 112, left: 40, size: 3 },
];

function joinedLabel(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `Đã tham gia ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

type StatProps = {
  label: string;
  value: string | number;
  color: string;
  icon: typeof Flame;
  onPress?: () => void;
  accessibilityLabel?: string;
};

function Stat({ label, value, color, icon: Icon, onPress, accessibilityLabel }: StatProps) {
  const body = (
    <View style={{ alignItems: 'center', gap: 6, paddingVertical: 14 }}>
      <Text weight="bold" className="text-xs text-muted" numberOfLines={1}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon size={18} color={color} fill={color === colors.coin ? color : 'transparent'} />
        <Text weight="black" className="text-xl" style={{ color }}>
          {value}
        </Text>
      </View>
    </View>
  );
  if (!onPress) return <View style={{ flex: 1 }}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={{ flex: 1 }}
      className="active:opacity-70">
      {body}
    </Pressable>
  );
}

/** Mascot scene over a framed identity card with the three headline numbers. */
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
    <View>
      <View
        style={{
          height: 220,
          borderRadius: 28,
          overflow: 'hidden',
          backgroundColor: colors.heroStart,
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}>
        <View
          style={{ position: 'absolute', right: -50, top: -60, width: 190, height: 190, borderRadius: 95, backgroundColor: colors.heroEnd, opacity: 0.5 }}
        />
        <View
          style={{ position: 'absolute', left: -40, bottom: -70, width: 170, height: 170, borderRadius: 85, backgroundColor: colors.heroEnd, opacity: 0.3 }}
        />
        {STARS.map((star) => (
          <View
            key={`${star.top}-${star.left}`}
            style={{ position: 'absolute', top: star.top, left: star.left, width: star.size, height: star.size, borderRadius: star.size, backgroundColor: '#ffffff', opacity: 0.7 }}
          />
        ))}
        {avatarUrl ? (
          <View style={{ width: 132, height: 132, borderRadius: 66, borderWidth: 4, borderColor: '#ffffff', overflow: 'hidden', marginBottom: 20 }}>
            <Image source={{ uri: avatarUrl }} accessibilityLabel="Avatar học viên" contentFit="cover" style={{ width: '100%', height: '100%' }} />
          </View>
        ) : (
          <Image source={OWL} accessibilityLabel="Cú IELTSPath" contentFit="contain" style={{ width: 180, height: 180, marginBottom: 14 }} />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chỉnh sửa ảnh"
          onPress={onEdit}
          style={{ position: 'absolute', right: 14, top: 14, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.28)' }}
          className="active:opacity-70">
          <Camera size={20} color="#ffffff" />
        </Pressable>
      </View>

      <View
        style={{
          marginTop: -24,
          borderRadius: 24,
          borderWidth: 2,
          borderBottomWidth: 4,
          borderColor: colors.line,
          borderBottomColor: colors.edge,
          backgroundColor: colors.surface,
          overflow: 'hidden',
        }}>
        <View style={{ alignItems: 'center', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16 }}>
          <Text weight="black" className="text-2xl text-ink" numberOfLines={1}>
            {name}
          </Text>
          <Text className="mt-0.5 text-sm text-muted" numberOfLines={1}>
            {email}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 }}>
            {joined ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Flag size={14} color={colors.accent} fill={colors.accent} />
                <Text weight="bold" className="text-xs text-muted">
                  {joined}
                </Text>
              </View>
            ) : null}
            {band ? (
              <View style={{ borderRadius: 999, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 2 }}>
                <Text weight="black" className="text-xs" style={{ color: colors.accentDeep }}>
                  {band}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', borderTopWidth: 2, borderColor: colors.line, backgroundColor: colors.canvas }}>
          <Stat label="Chuỗi ngày học" value={streak} color={colors.flame} icon={Flame} />
          <View style={{ width: 2, backgroundColor: colors.line }} />
          <Stat label="Tổng XP" value={xp} color={colors.coin} icon={Zap} />
          <View style={{ width: 2, backgroundColor: colors.line }} />
          <Stat
            label="Theo dõi"
            value={followers}
            color={colors.social}
            icon={UsersRound}
            onPress={onOpenCommunity}
            accessibilityLabel="Xem hồ sơ cộng đồng và người theo dõi"
          />
        </View>
      </View>
    </View>
  );
}
