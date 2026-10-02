import { Flame, LogOut, Mail, Phone, ShieldCheck, Trophy, UserRound, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { useAuth, useCurrentUser } from '@/src/features/auth/auth-provider';
import { learnerStats, pathUnits } from '@/src/features/practice/path';
import { useStreak } from '@/src/features/progress/use-streak';
import { colors } from '@/src/theme';

const roleLabels: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  CUSTOMER: 'Học viên',
  CONTENT_AUTHOR: 'Biên soạn nội dung',
  EXAMINER: 'Giám khảo',
  SALES_STAFF: 'Tư vấn viên',
};

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const weekDone = [true, true, true, true, false, false, false];

export default function ProfileScreen() {
  const { authEnabled, signOut } = useAuth();
  const { data: user, error, isPending, isRefetching, refetch } = useCurrentUser();
  const { currentDays, longestDays, isMock: streakMock, refetch: refetchStreak } = useStreak();
  const [signingOut, setSigningOut] = useState(false);
  const doneNodes = pathUnits.flatMap((unit) => unit.nodes).filter((node) => node.status === 'done').length;

  const doSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    if (Platform.OS === 'web') {
      void doSignOut();
      return;
    }
    Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất khỏi IELTSPath?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => void doSignOut() },
    ]);
  };

  const initial = user?.fullName.trim().charAt(0).toUpperCase() ?? '?';

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="px-5 pb-12 pt-5"
      refreshControl={
        authEnabled ? (
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
              void refetchStreak();
            }}
            tintColor={colors.accentDeep}
          />
        ) : undefined
      }>
      <Text weight="bold" className="text-xs uppercase tracking-widest text-accent-deep">
        Tiến độ
      </Text>
      <Text weight="black" className="mt-1.5 text-3xl leading-10" style={{ letterSpacing: -0.8 }}>
        Streak & XP của bạn
      </Text>
      <Text className="mt-1 text-xs text-muted">
        Streak: {streakMock ? 'mock/fallback' : 'BE'} · XP path: mock · Node xong: mock
      </Text>

      <View className="mt-5 flex-row gap-3">
        <StatTile Icon={Flame} color={colors.accentWarm} value={`${currentDays}`} label="Ngày liên tiếp" />
        <StatTile Icon={Zap} color={colors.xpDeep} value={`${learnerStats.xp}`} label="Tổng XP" />
        <StatTile Icon={Trophy} color={colors.skill.listening} value={`${doneNodes}`} label="Node xong" />
      </View>
      {!streakMock ? (
        <Text className="mt-2 text-xs text-muted">Kỷ lục streak: {longestDays} ngày</Text>
      ) : null}

      <Card className="mt-4">
        <Text weight="extrabold" className="text-base">
          Tuần này
        </Text>
        <View className="mt-3 flex-row justify-between">
          {weekDays.map((day, index) => (
            <View key={day} className="items-center gap-1.5">
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: weekDone[index] ? colors.accent : colors.line }}>
                {weekDone[index] ? (
                  <Flame size={16} color="#fff" fill="#fff" />
                ) : (
                  <Text weight="bold" className="text-xs text-muted">
                    {day}
                  </Text>
                )}
              </View>
              <Text weight="bold" className="text-[10px] text-muted">
                {day}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {!authEnabled ? (
        <Card className="mt-4 items-center py-6">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
            <UserRound size={28} color={colors.accentDeep} />
          </View>
          <Text weight="extrabold" className="mt-4 text-lg">
            Đang xem với tư cách khách
          </Text>
          <Text className="mt-1.5 text-center text-sm leading-5 text-muted">
            Streak và XP đang là bản demo trên máy. Đồng bộ tài khoản khi bật auth.
          </Text>
        </Card>
      ) : isPending ? (
        <View className="mt-10 items-center gap-3">
          <ActivityIndicator color={colors.accentDeep} />
          <Text className="text-sm text-muted">Đang mở không gian học tập…</Text>
        </View>
      ) : error && !user ? (
        <View className="mt-6 gap-3">
          <FormAlert message={error.message} />
          <Button variant="secondary" label="Thử lại" onPress={() => refetch()} />
        </View>
      ) : user ? (
        <>
          <Card className="mt-4">
            <View className="flex-row items-center gap-4">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-accent">
                <Text weight="black" className="text-2xl text-white">
                  {initial}
                </Text>
              </View>
              <View className="flex-1">
                <Text weight="extrabold" className="text-xl" numberOfLines={2}>
                  {user.fullName}
                </Text>
                <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                  {user.roles.map((role) => (
                    <View key={role.id} className="rounded-full bg-accent-soft px-2.5 py-1">
                      <Text weight="bold" className="text-[11px] text-accent-deep">
                        {roleLabels[role.name] ?? role.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View className="mt-5 gap-3 border-t border-line pt-4">
              <InfoRow Icon={Mail} label="Email" value={user.email} />
              <InfoRow Icon={Phone} label="Số điện thoại" value={user.phoneNumber || 'Chưa cập nhật'} />
              <InfoRow
                Icon={ShieldCheck}
                label="Trạng thái"
                value={user.status === 'ACTIVE' ? 'Đang hoạt động' : user.status}
              />
            </View>
          </Card>

          <Button
            className="mt-6"
            variant="danger"
            label="Đăng xuất"
            loadingLabel="Đang đăng xuất…"
            loading={signingOut}
            icon={<LogOut size={18} color={colors.danger} />}
            onPress={confirmSignOut}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

function StatTile({
  Icon,
  color,
  value,
  label,
}: {
  Icon: LucideIcon;
  color: string;
  value: string;
  label: string;
}) {
  return (
    <View className="flex-1 items-center rounded-3xl border border-line border-b-4 border-b-edge bg-surface px-2 py-3">
      <Icon size={20} color={color} />
      <Text weight="black" className="mt-1 text-xl" style={{ color }}>
        {value}
      </Text>
      <Text weight="bold" className="text-center text-[10px] text-muted">
        {label}
      </Text>
    </View>
  );
}

function InfoRow({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-3" accessible accessibilityLabel={`${label}: ${value}`}>
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-canvas">
        <Icon size={18} color={colors.muted} />
      </View>
      <View className="flex-1">
        <Text className="text-xs text-muted">{label}</Text>
        <Text weight="semibold" className="text-sm" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}
