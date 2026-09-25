import { LogOut, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { useAuth, useCurrentUser } from '@/src/features/auth/auth-provider';
import { colors } from '@/src/theme';

const roleLabels: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  CUSTOMER: 'Học viên',
  CONTENT_AUTHOR: 'Biên soạn nội dung',
  EXAMINER: 'Giám khảo',
  SALES_STAFF: 'Tư vấn viên',
};

export default function ProfileScreen() {
  const { authEnabled, signOut } = useAuth();
  const { data: user, error, isPending, isRefetching, refetch } = useCurrentUser();
  const [signingOut, setSigningOut] = useState(false);

  if (!authEnabled) {
    return (
      <ScrollView className="flex-1 bg-canvas" contentContainerClassName="px-5 pb-10 pt-5">
        <Text weight="bold" className="text-xs uppercase tracking-widest text-accent-deep">
          Bảng tiến độ
        </Text>
        <Text weight="black" className="mt-1.5 text-3xl leading-10" style={{ letterSpacing: -0.8 }}>
          Tài khoản của bạn
        </Text>

        <Card className="mt-6 items-center py-8">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
            <UserRound size={28} color={colors.accentDeep} />
          </View>
          <Text weight="extrabold" className="mt-4 text-lg">
            Đang xem với tư cách khách
          </Text>
          <Text className="mt-1.5 text-center text-sm leading-5 text-muted">
            Đăng nhập tạm tắt vì chưa có DB / API. Bật lại bằng `EXPO_PUBLIC_AUTH_ENABLED=true` khi backend sẵn sàng.
          </Text>
        </Card>
      </ScrollView>
    );
  }

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
      contentContainerClassName="px-5 pb-10 pt-5"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accentDeep} />
      }>
      <Text weight="bold" className="text-xs uppercase tracking-widest text-accent-deep">
        Bảng tiến độ
      </Text>
      <Text weight="black" className="mt-1.5 text-3xl leading-10" style={{ letterSpacing: -0.8 }}>
        Tài khoản của bạn
      </Text>

      {isPending ? (
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
        <Card className="mt-6">
          <View className="flex-row items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-3xl bg-accent">
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
      ) : null}

      <Button
        className="mt-6"
        variant="danger"
        label="Đăng xuất"
        loadingLabel="Đang đăng xuất…"
        loading={signingOut}
        icon={<LogOut size={18} color={colors.danger} />}
        onPress={confirmSignOut}
      />
    </ScrollView>
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
