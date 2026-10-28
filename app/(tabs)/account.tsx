import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import {
  BadgeCheck,
  Bell,
  Calendar,
  ChevronRight,
  CreditCard,
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
import { useUnread } from '@/src/features/community/use-unread';
import {
  clearAppSettingsStorage,
  type FontSizeOption,
  useAppSettings,
} from '@/src/features/settings/use-app-settings';
import { API_BASE_URL } from '@/src/lib/env';
import { colors } from '@/src/theme';
import { useRouter } from 'expo-router';

const roleLabels: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  CUSTOMER: 'Học viên',
  CONTENT_AUTHOR: 'Biên soạn nội dung',
  EXAMINER: 'Giám khảo',
  SALES_STAFF: 'Tư vấn viên',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Tạm ngưng',
  LOCKED: 'Bị khóa',
};

function formatJoined(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('vi-VN');
}

const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';
const FONT_OPTIONS: FontSizeOption[] = ['S', 'M', 'L'];
const XP_PRESETS = [30, 50, 80, 100] as const;

type PlanId = 'basic' | 'premium30' | 'premium90';

const PLANS: { id: PlanId; name: string; price: string; detail: string }[] = [
  { id: 'basic', name: 'Basic', price: 'Miễn phí', detail: 'Lộ trình và flashcards cơ bản' },
  { id: 'premium30', name: 'Premium 30 ngày', price: '199.000đ', detail: '4 lượt chấm giáo viên' },
  { id: 'premium90', name: 'Premium 90 ngày', price: '499.000đ', detail: '12 lượt chấm giáo viên' },
];

const TOPUP = [
  { points: 50, price: '49.000đ' },
  { points: 100, price: '89.000đ' },
];

const checkoutUrl = process.env.EXPO_PUBLIC_CHECKOUT_URL;

export default function AccountScreen() {
  const router = useRouter();
  const { authEnabled, signOut } = useAuth();
  const { data: user, error, isPending, isRefetching, refetch } = useCurrentUser();
  const { settings, update, setDailyXpGoal } = useAppSettings();
  const queryClient = useQueryClient();
  const unread = useUnread();
  const [signingOut, setSigningOut] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [planId, setPlanId] = useState<PlanId>('basic');
  const [points, setPoints] = useState(0);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showAccountDetails, setShowAccountDetails] = useState(false);

  const currentPlan = PLANS.find((plan) => plan.id === planId) ?? PLANS[0];

  const confirmAction = (title: string, message: string, onOk: () => void) => {
    if (checkoutUrl) {
      void WebBrowser.openBrowserAsync(checkoutUrl);
      return;
    }
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n${message}`)) onOk();
      return;
    }
    Alert.alert(title, message, [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xác nhận', onPress: onOk },
    ]);
  };

  const buyPlan = (id: PlanId) => {
    const plan = PLANS.find((item) => item.id === id);
    if (!plan || id === planId) return;
    confirmAction('Mua gói', `${plan.name} · ${plan.price}. Đây là thanh toán demo, chưa trừ tiền thật.`, () =>
      setPlanId(id),
    );
  };

  const topUp = (amount: number, price: string) => {
    confirmAction('Nạp điểm', `Nạp ${amount} điểm · ${price}. Đây là giao dịch demo.`, () =>
      setPoints((value) => value + amount),
    );
  };

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
      if (window.confirm('Bạn muốn đăng xuất khỏi IELTSPath?')) void doSignOut();
      return;
    }
    Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất khỏi IELTSPath?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => void doSignOut() },
    ]);
  };

  const onChangePassword = () => {
    const message = 'Đổi mật khẩu sẽ mở khi BE sẵn sàng.';
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
      if (window.confirm('Xóa cài đặt đã lưu và cache dữ liệu tạm trên máy?')) void run();
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
      <View className="mb-1 flex-row items-center justify-between">
        <View>
          <Text weight="black" className="text-2xl">Hồ sơ</Text>
          <Text className="mt-1 text-sm text-muted">Thông tin cá nhân và cài đặt</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Thông báo${(unread.data?.count ?? 0) > 0 ? `, ${unread.data?.count} chưa đọc` : ''}`}
          onPress={() => {
            void queryClient.invalidateQueries({ queryKey: ['community', 'notifications'] });
            void queryClient.invalidateQueries({ queryKey: ['community', 'unread'] });
            router.push('/community/notifications' as never);
          }}
          className="h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface"
        >
          <Bell size={21} color={colors.accent} />
          {(unread.data?.count ?? 0) > 0 ? (
            <View className="absolute right-1 top-1 min-w-4 items-center rounded-full px-1" style={{ backgroundColor: colors.danger }}>
              <Text weight="bold" className="text-[9px] text-white">{unread.data!.count > 99 ? '99+' : unread.data!.count}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

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
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAccountDetails }} onPress={() => setShowAccountDetails((value) => !value)} className="mt-4 min-h-11 flex-row items-center justify-between border-t border-line pt-3"><Text weight="semibold" className="text-sm text-accent">{showAccountDetails ? "Ẩn thông tin chi tiết" : "Xem thông tin chi tiết"}</Text><ChevronRight size={18} color={colors.muted} style={{ transform: [{ rotate: showAccountDetails ? '90deg' : '0deg' }] }} /></Pressable>
          {showAccountDetails ? <View className="mt-2 gap-3">
            <InfoRow Icon={Mail} label="Email" value={user.email} />
            <InfoRow Icon={Phone} label="Số điện thoại" value={user.phoneNumber || 'Chưa cập nhật'} />
            <InfoRow Icon={ShieldCheck} label="Vai trò" value={user.roles.map((r) => roleLabels[r.name] ?? r.name).join(', ') || '—'} />
            <InfoRow Icon={BadgeCheck} label="Trạng thái" value={statusLabels[user.status] ?? user.status} />
            <InfoRow Icon={Calendar} label="Tham gia" value={formatJoined(user.createdAt)} />
          </View> : null}
        </Card>
      ) : null}

      <SettingsSection title="Học tập & thông báo" expanded={expandedSection === "Học tập & thông báo"} onToggle={() => setExpandedSection((current) => current === "Học tập & thông báo" ? null : "Học tập & thông báo")} >
        <Button variant="ghost" label="Tiến độ học tập" onPress={() => router.push('/progress' as never)} />
        <Button variant="ghost" label="Tuỳ chọn thông báo cộng đồng" onPress={() => router.push('/community/notification-preferences' as never)} />
      </SettingsSection>
      <SettingsSection title="Gói học & thanh toán" expanded={expandedSection === "Gói học & thanh toán"} onToggle={() => setExpandedSection((current) => current === "Gói học & thanh toán" ? null : "Gói học & thanh toán")} >
        <View className="mb-3 rounded-2xl bg-canvas px-3 py-3">
          <Text className="text-xs text-muted">Gói hiện tại</Text>
          <Text weight="extrabold" className="mt-0.5 text-base">
            {planId === 'basic' ? 'Chưa có gói trả phí' : currentPlan.name}
          </Text>
          <Text className="mt-0.5 text-xs text-muted">Số dư {points} điểm</Text>
        </View>
        <View className="gap-2">
          {PLANS.map((plan) => {
            const active = plan.id === planId;
            return (
              <View
                key={plan.id}
                className="flex-row items-center gap-3 rounded-2xl border px-3 py-3"
                style={{
                  borderColor: active ? colors.accent : colors.line,
                  backgroundColor: active ? colors.accentSoft : colors.surface,
                }}>
                <CreditCard size={18} color={active ? colors.accentDeep : colors.muted} />
                <View className="flex-1">
                  <Text weight="extrabold" className="text-sm">
                    {plan.name}
                  </Text>
                  <Text className="text-xs text-muted">{plan.detail}</Text>
                </View>
                <View className="items-end gap-1">
                  <Text weight="extrabold" className="text-sm text-accent-deep">
                    {plan.price}
                  </Text>
                  {plan.id !== 'basic' && !active ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Mua ${plan.name}`} onPress={() => buyPlan(plan.id)}>
                      <Text weight="extrabold" className="text-xs text-xp-deep">
                        Mua gói
                      </Text>
                    </Pressable>
                  ) : active ? (
                    <Text weight="bold" className="text-xs text-success">
                      Đang dùng
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
        <View className="mt-3 flex-row gap-2">
          {TOPUP.map((pack) => (
            <Pressable
              key={pack.points}
              accessibilityRole="button"
              accessibilityLabel={`Nạp ${pack.points} điểm`}
              onPress={() => topUp(pack.points, pack.price)}
              className="flex-1 items-center rounded-2xl border border-b-4 border-line border-b-edge bg-surface py-2.5">
              <Text weight="extrabold" className="text-sm">
                +{pack.points} điểm
              </Text>
              <Text className="text-xs text-muted">{pack.price}</Text>
            </Pressable>
          ))}
        </View>
      </SettingsSection>

      {/* Tài khoản */}
      <SettingsSection title="Tài khoản" expanded={expandedSection === "Tài khoản"} onToggle={() => setExpandedSection((current) => current === "Tài khoản" ? null : "Tài khoản")} >
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
      <SettingsSection title="Học tập" expanded={expandedSection === "Học tập"} onToggle={() => setExpandedSection((current) => current === "Học tập" ? null : "Học tập")} >
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
      <SettingsSection title="Thông báo" expanded={expandedSection === "Thông báo"} onToggle={() => setExpandedSection((current) => current === "Thông báo" ? null : "Thông báo")} >
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
      <SettingsSection title="Giao diện" expanded={expandedSection === "Giao diện"} onToggle={() => setExpandedSection((current) => current === "Giao diện" ? null : "Giao diện")} >
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
        <Text weight="semibold" className="mb-2 mt-4 text-sm">
          Giao diện
        </Text>
        <View className="flex-row gap-2">
          {(['light', 'dark'] as const).map((theme) => {
            const active = settings.theme === theme;
            const label = theme === 'light' ? 'Sáng' : 'Tối';
            return (
              <Pressable
                key={theme}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => void update({ theme })}
                className="flex-1 items-center rounded-2xl border border-b-4 py-2.5"
                style={{
                  borderColor: active ? colors.accent : colors.line,
                  borderBottomColor: active ? colors.accentEdge : colors.edge,
                  backgroundColor: active ? colors.accentSoft : colors.surface,
                }}>
                <Text weight="extrabold" className="text-sm" style={{ color: active ? colors.accentDeep : colors.ink }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SettingsSection>

      {/* Ứng dụng */}
      <SettingsSection title="Ứng dụng" expanded={expandedSection === "Ứng dụng"} onToggle={() => setExpandedSection((current) => current === "Ứng dụng" ? null : "Ứng dụng")} >
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

function SettingsSection({ title, children, expanded = false, onToggle }: { title: string; children: ReactNode; expanded?: boolean; onToggle?: () => void }) {
  return (
    <View className="mt-3 overflow-hidden rounded-3xl border border-line bg-surface">
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle} className="min-h-14 flex-row items-center justify-between px-4 py-3">
        <Text weight="bold" className="flex-1 text-sm">{title}</Text>
        <ChevronRight size={18} color={colors.muted} style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }} />
      </Pressable>
      {expanded ? <View className="gap-1 border-t border-line px-4 py-3">{children}</View> : null}
    </View>
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
