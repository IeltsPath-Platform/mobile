import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import {
  Bell,
  ChevronRight,
  Flame,
  KeyRound,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Trash2,
  UserRound,
  Zap,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { useAuth, useCurrentUser } from '@/src/features/auth/auth-provider';
import {
  clearAppSettingsStorage,
  type FontSizeOption,
  useAppSettings,
} from '@/src/features/settings/use-app-settings';
import { API_BASE_URL } from '@/src/lib/env';
import { colors } from '@/src/theme';

const roleLabels: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  CUSTOMER: 'Học viên',
  CONTENT_AUTHOR: 'Biên soạn nội dung',
  EXAMINER: 'Giám khảo',
  SALES_STAFF: 'Tư vấn viên',
};

const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';
const FONT_OPTIONS: FontSizeOption[] = ['S', 'M', 'L'];
const XP_PRESETS = [30, 50, 80, 100] as const;

export default function AccountScreen() {
  const { authEnabled, signOut } = useAuth();
  const { data: user, error, isPending, isRefetching, refetch } = useCurrentUser();
  const { settings, update, setDailyXpGoal } = useAppSettings();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showProfileDetail, setShowProfileDetail] = useState(false);

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

  const onChangePassword = () => {
    const message = 'Đổi mật khẩu sẽ mở khi auth-service sẵn sàng.';
    if (Platform.OS === 'web') window.alert(message);
    else Alert.alert('Đổi mật khẩu', message);
  };

  const onTerms = () => {
    void WebBrowser.openBrowserAsync('https://example.com/terms');
  };

  const onSupport = () => {
    void WebBrowser.openBrowserAsync('mailto:support@ieltspath.local');
  };

  const clearLocalCache = () => {
    const run = async () => {
      setClearing(true);
      try {
        await clearAppSettingsStorage();
        queryClient.clear();
        if (Platform.OS === 'web') window.alert('Đã xóa cache local.');
        else Alert.alert('Xóa cache', 'Đã xóa cache local trên máy.');
      } finally {
        setClearing(false);
      }
    };

    if (Platform.OS === 'web') {
      void run();
      return;
    }
    Alert.alert('Xóa cache local', 'Xóa cài đặt đã lưu và cache dữ liệu tạm trên máy?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => void run() },
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
            }}
            tintColor={colors.accentDeep}
          />
        ) : undefined
      }>
      <Text weight="bold" className="text-xs uppercase tracking-widest text-accent-deep">
        Profile
      </Text>
      <Text weight="black" className="mt-1.5 text-3xl leading-10" style={{ letterSpacing: -0.8 }}>
        Cài đặt
      </Text>

      {/* Header user */}
      {!authEnabled ? (
        <Card className="mt-5 items-center py-6">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
            <UserRound size={28} color={colors.accentDeep} />
          </View>
          <Text weight="extrabold" className="mt-4 text-lg">
            Khách
          </Text>
          <Text className="mt-1.5 text-center text-sm leading-5 text-muted">
            Bật đăng nhập để đồng bộ hồ sơ trên tài khoản của bạn.
          </Text>
        </Card>
      ) : isPending ? (
        <View className="mt-10 items-center gap-3">
          <ActivityIndicator color={colors.accentDeep} />
          <Text className="text-sm text-muted">Đang tải hồ sơ…</Text>
        </View>
      ) : error && !user ? (
        <View className="mt-6 gap-3">
          <FormAlert message={error.message} />
          <Button variant="secondary" label="Thử lại" onPress={() => refetch()} />
        </View>
      ) : user ? (
        <Card className="mt-5">
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
              <Text className="mt-0.5 text-sm text-muted" numberOfLines={1}>
                {user.email}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      {/* Tài khoản */}
      <SettingsSection title="Tài khoản">
        <SettingsRow
          Icon={UserRound}
          label="Xem hồ sơ"
          hint={user?.fullName ?? 'Thông tin tài khoản'}
          onPress={() => setShowProfileDetail((v) => !v)}
        />
        {showProfileDetail && user ? (
          <View className="mb-2 gap-3 rounded-2xl bg-canvas px-3 py-3">
            <InfoRow Icon={Mail} label="Email" value={user.email} />
            <InfoRow Icon={Phone} label="Số điện thoại" value={user.phoneNumber || 'Chưa cập nhật'} />
            <InfoRow
              Icon={ShieldCheck}
              label="Vai trò"
              value={user.roles.map((r) => roleLabels[r.name] ?? r.name).join(', ') || '—'}
            />
          </View>
        ) : null}
        <SettingsRow Icon={KeyRound} label="Đổi mật khẩu" hint="Sắp có" onPress={onChangePassword} />
        {authEnabled && user ? (
          <SettingsRow
            Icon={LogOut}
            label="Đăng xuất"
            hint="Thoát tài khoản hiện tại"
            danger
            onPress={confirmSignOut}
            trailing={
              signingOut ? <ActivityIndicator color={colors.danger} /> : <ChevronRight size={18} color={colors.danger} />
            }
          />
        ) : null}
      </SettingsSection>

      {/* Học tập */}
      <SettingsSection title="Học tập">
        <View className="mb-1 flex-row items-center gap-3 px-1">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-canvas">
            <Zap size={18} color={colors.xpDeep} />
          </View>
          <View className="flex-1">
            <Text weight="semibold" className="text-sm">
              Mục tiêu XP / ngày
            </Text>
            <Text className="text-xs text-muted">Hiện tại: {settings.dailyXpGoal} XP</Text>
          </View>
        </View>
        <View className="mt-2 flex-row gap-2">
          {XP_PRESETS.map((goal) => {
            const active = settings.dailyXpGoal === goal;
            return (
              <Pressable
                key={goal}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => void setDailyXpGoal(goal)}
                className="flex-1 items-center rounded-2xl border border-b-4 px-2 py-2.5"
                style={{
                  borderColor: active ? colors.accent : colors.line,
                  borderBottomColor: active ? colors.accentEdge : colors.edge,
                  backgroundColor: active ? colors.accentSoft : colors.surface,
                }}>
                <Text weight="extrabold" className="text-sm" style={{ color: active ? colors.accentDeep : colors.ink }}>
                  {goal}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SettingsSection>

      {/* Thông báo */}
      <SettingsSection title="Thông báo">
        <ToggleRow
          Icon={Bell}
          label="Nhắc học"
          hint="Nhắc mở bài trong ngày"
          value={settings.notifyStudy}
          onValueChange={(notifyStudy) => void update({ notifyStudy })}
        />
        <ToggleRow
          Icon={Flame}
          label="Nhắc streak"
          hint="Giữ chuỗi ngày học"
          value={settings.notifyStreak}
          onValueChange={(notifyStreak) => void update({ notifyStreak })}
        />
      </SettingsSection>

      {/* Giao diện */}
      <SettingsSection title="Giao diện">
        <Text weight="semibold" className="mb-2 text-sm">
          Cỡ chữ
        </Text>
        <View className="flex-row gap-2">
          {FONT_OPTIONS.map((size) => {
            const active = settings.fontSize === size;
            return (
              <Pressable
                key={size}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => void update({ fontSize: size })}
                className="flex-1 items-center rounded-2xl border border-b-4 py-2.5"
                style={{
                  borderColor: active ? colors.accent : colors.line,
                  borderBottomColor: active ? colors.accentEdge : colors.edge,
                  backgroundColor: active ? colors.accentSoft : colors.surface,
                }}>
                <Text
                  weight="extrabold"
                  style={{
                    color: active ? colors.accentDeep : colors.ink,
                    fontSize: size === 'S' ? 13 : size === 'L' ? 18 : 15,
                  }}>
                  {size}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View className="mt-4 flex-row items-center justify-between gap-3 border-t border-line pt-4">
          <View className="flex-1">
            <Text weight="semibold" className="text-sm">
              Theme sáng
            </Text>
            <Text className="text-xs text-muted">Theme tối sẽ có sau</Text>
          </View>
          <View className="rounded-full bg-accent-soft px-3 py-1">
            <Text weight="bold" className="text-xs text-accent-deep">
              Light
            </Text>
          </View>
        </View>
      </SettingsSection>

      {/* Ứng dụng */}
      <SettingsSection title="Ứng dụng">
        <SettingsRow Icon={ShieldCheck} label="Phiên bản" hint={`v${appVersion}`} />
        <SettingsRow label="Điều khoản" hint="Chính sách sử dụng" onPress={onTerms} />
        <SettingsRow label="Hỗ trợ" hint="Liên hệ đội ngũ" onPress={onSupport} />
        <SettingsRow
          Icon={Trash2}
          label="Xóa cache local"
          hint="Cài đặt + dữ liệu tạm"
          danger
          onPress={clearLocalCache}
          trailing={
            clearing ? <ActivityIndicator color={colors.danger} /> : <ChevronRight size={18} color={colors.danger} />
          }
        />
        {__DEV__ ? (
          <View className="mt-2 rounded-2xl bg-canvas px-3 py-3">
            <Text weight="bold" className="text-xs text-muted">
              DEV · API base
            </Text>
            <Text weight="semibold" className="mt-1 text-xs text-ink" selectable>
              {API_BASE_URL}
            </Text>
          </View>
        ) : null}
      </SettingsSection>
    </ScrollView>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="mt-4">
      <Text weight="extrabold" className="mb-3 text-base">
        {title}
      </Text>
      <View className="gap-1">{children}</View>
    </Card>
  );
}

function SettingsRow({
  Icon,
  label,
  hint,
  onPress,
  danger,
  trailing,
}: {
  Icon?: LucideIcon;
  label: string;
  hint?: string;
  onPress?: () => void;
  danger?: boolean;
  trailing?: ReactNode;
}) {
  const content = (
    <View className="flex-row items-center gap-3 py-2.5">
      {Icon ? (
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-canvas">
          <Icon size={18} color={danger ? colors.danger : colors.muted} />
        </View>
      ) : (
        <View className="h-9 w-9" />
      )}
      <View className="flex-1">
        <Text weight="semibold" className="text-sm" style={danger ? { color: colors.danger } : undefined}>
          {label}
        </Text>
        {hint ? <Text className="text-xs text-muted">{hint}</Text> : null}
      </View>
      {trailing ?? (onPress ? <ChevronRight size={18} color={colors.muted} /> : null)}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      {content}
    </Pressable>
  );
}

function ToggleRow({
  Icon,
  label,
  hint,
  value,
  onValueChange,
}: {
  Icon: LucideIcon;
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-2.5">
      <View className="flex-1 flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-canvas">
          <Icon size={18} color={colors.muted} />
        </View>
        <View className="flex-1">
          <Text weight="semibold" className="text-sm">
            {label}
          </Text>
          {hint ? <Text className="text-xs text-muted">{hint}</Text> : null}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.line, true: colors.accentSoft }}
        thumbColor={value ? colors.accent : colors.muted}
        accessibilityLabel={label}
      />
    </View>
  );
}

function InfoRow({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-3" accessible accessibilityLabel={`${label}: ${value}`}>
      <Icon size={16} color={colors.muted} />
      <View className="flex-1">
        <Text className="text-xs text-muted">{label}</Text>
        <Text weight="semibold" className="text-sm" numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}
