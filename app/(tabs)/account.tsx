import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { Bell, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, KeyRound, LogOut, Moon, Settings2, Trash2, UserRound, Zap } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Animated, Platform, Pressable, RefreshControl, ScrollView, Switch, View, type ScrollViewInstance } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { useAuth, useCurrentUser } from '@/src/features/auth/auth-provider';
import { communityApi } from '@/src/features/community/api';
import { useUnread } from '@/src/features/community/use-unread';
import { profileApi, profileQueryKeys } from '@/src/features/profile/api';
import { ProfileAchievements } from '@/src/features/profile/profile-achievements';
import { ProfileCommunityCard } from '@/src/features/profile/profile-community-card';
import { ProfileHero } from '@/src/features/profile/profile-hero';
import { ProfileSummaryCard } from '@/src/features/profile/profile-summary-card';
import { useProgress } from '@/src/features/progress/progress-summary';
import { useStreak } from '@/src/features/progress/use-streak';
import { clearAppSettingsStorage, type FontSizeOption, useAppSettings } from '@/src/features/settings/use-app-settings';
import { vocabApi } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

const FONT_OPTIONS: FontSizeOption[] = ['S', 'M', 'L'];
const XP_PRESETS = [30, 50, 80, 100] as const;
const APP_VERSION = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';

export default function AccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authEnabled, signOut } = useAuth();
  const userQuery = useCurrentUser();
  const user = userQuery.data;
  const learnerQuery = useQuery({ queryKey: profileQueryKeys.learner, queryFn: profileApi.getLearnerProfile, enabled: authEnabled && Boolean(user) });
  const topicQuery = useQuery({ queryKey: ['vocab', 'topics'], queryFn: ({ signal }) => vocabApi.listTopics(signal), staleTime: 5 * 60_000 });
  const relationshipsQuery = useQuery({ queryKey: ['community', 'relationship', user?.id], queryFn: () => communityApi.relationship(user!.id), enabled: authEnabled && Boolean(user), staleTime: 60_000 });
  const achievementsQuery = useQuery({ queryKey: ['vocab', 'achievements'], queryFn: () => vocabApi.achievements(), enabled: authEnabled && Boolean(user), staleTime: 60_000 });
  const progress = useProgress();
  const streak = useStreak();
  const unread = useUnread();
  const { settings, update, setDailyXpGoal } = useAppSettings();
  const [busy, setBusy] = useState<'signout' | 'cache' | null>(null);
  const [expandedPreference, setExpandedPreference] = useState<'goal' | 'custom' | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const owlGlow = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => () => {
    setExpandedPreference(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []));

  useEffect(() => {
    if (!authEnabled || !user) return;
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(owlGlow, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.timing(owlGlow, { toValue: 0, duration: 1800, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [authEnabled, owlGlow, user]);

  const openNotifications = () => {
    void queryClient.invalidateQueries({ queryKey: ['community', 'notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['community', 'unread'] });
    router.push('/community/notifications' as never);
  };

  const signOutPrompt = () => {
    const run = async () => {
      setBusy('signout');
      try { await signOut(); } finally { setBusy(null); }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Bạn muốn đăng xuất khỏi IELTSPath?')) void run();
      return;
    }
    Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất khỏi IELTSPath?', [
      { text: 'Ở lại', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => void run() },
    ]);
  };

  const clearCachePrompt = () => {
    const run = async () => {
      setBusy('cache');
      try {
        await clearAppSettingsStorage();
        queryClient.clear();
        if (Platform.OS === 'web') window.alert('Đã xóa dữ liệu tạm trên máy.');
        else Alert.alert('Đã xóa dữ liệu tạm', 'Cài đặt ứng dụng đã được đặt lại.');
      } finally { setBusy(null); }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Xóa cài đặt đã lưu và dữ liệu tạm trên máy?')) void run();
      return;
    }
    Alert.alert('Xóa dữ liệu tạm', 'Bạn có muốn xóa cài đặt đã lưu trên thiết bị?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => void run() },
    ]);
  };

  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1 bg-canvas"
      contentContainerClassName="px-5 pb-10 pt-0"
      refreshControl={authEnabled ? <RefreshControl refreshing={userQuery.isRefetching || learnerQuery.isRefetching || topicQuery.isRefetching || relationshipsQuery.isRefetching || achievementsQuery.isRefetching || progress.isRefetching || streak.isRefetching || unread.isRefetching} onRefresh={() => { void userQuery.refetch(); void learnerQuery.refetch(); void topicQuery.refetch(); void relationshipsQuery.refetch(); void achievementsQuery.refetch(); void progress.refetch(); void streak.refetch(); void unread.refetch(); }} tintColor={colors.accent} /> : undefined}>
      {!authEnabled ? (
        <Card className="items-center rounded-3xl p-6">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-accent-soft"><UserRound size={27} color={colors.accentDeep} /></View>
          <Text weight="extrabold" className="mt-4 text-lg">Đăng nhập để đồng bộ hồ sơ</Text>
          <Button className="mt-5 w-full" label="Đăng nhập" onPress={() => router.push('/(auth)/login' as never)} />
        </Card>
      ) : userQuery.isPending ? (
        <View className="my-12 items-center gap-3"><ActivityIndicator color={colors.accent} /><Text className="text-sm text-muted">Đang tải hồ sơ…</Text></View>
      ) : userQuery.isError && !user ? (
        <View className="gap-3"><FormAlert message={userQuery.error.message} /><Button variant="secondary" label="Thử lại" onPress={() => void userQuery.refetch()} /></View>
      ) : user ? (
        <>
          <ProfileHero topics={topicQuery.data ?? []} pulse={owlGlow} xpToday={progress.data?.xpToday ?? 0} dailyGoal={settings.dailyXpGoal} onStart={() => router.push('/(tabs)/practice' as never)} />

          <ProfileSummaryCard
            name={learnerQuery.data?.displayName || user.fullName}
            email={user.email}
            joined={learnerQuery.data?.createdAt ? new Date(learnerQuery.data.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
            band={learnerQuery.data?.selfReportedBand != null ? `Band ${learnerQuery.data.selfReportedBand}` : '—'}
            streak={streak.currentDays}
            xp={progress.data?.totalXp}
            onEdit={() => router.push('/profile/edit' as never)}
            error={learnerQuery.isError || progress.isError || Boolean(streak.error)}
          />

          <ProfileCommunityCard followers={relationshipsQuery.data?.followerCount} following={relationshipsQuery.data?.followingCount} onPress={() => router.push('/(tabs)/community' as never)} />

          <ProfileAchievements items={achievementsQuery.data?.items} loading={achievementsQuery.isPending} error={achievementsQuery.isError} onRetry={() => void achievementsQuery.refetch()} />

          <Text weight="black" className="mb-3 mt-1 text-lg">Nội dung khác</Text>

          <SettingsGroup title="TÀI KHOẢN">
            <SettingsRow icon={KeyRound} title="Đổi mật khẩu" onPress={() => router.push('/profile/change-password' as never)} />
          </SettingsGroup>

          <SettingsGroup title="HỌC TẬP & CỘNG ĐỒNG">
            <SettingsRow icon={BookOpen} title="Tiến độ học tập" onPress={() => router.push('/progress' as never)} />
            <SettingsRow icon={Bell} title="Thông báo" badge={unread.data?.count ?? 0} onPress={openNotifications} />
            <SettingsRow icon={Settings2} title="Cài đặt thông báo" onPress={() => router.push('/community/notification-preferences' as never)} />
          </SettingsGroup>

          <SettingsDisclosure
            title="MỤC TIÊU HỌC"
            label="Mục tiêu mỗi ngày"
            icon={Zap}
            summary={`${settings.dailyXpGoal} XP mỗi ngày`}
            expanded={expandedPreference === 'goal'}
            onPress={() => setExpandedPreference(expandedPreference === 'goal' ? null : 'goal')}>
            <View className="border-t border-line px-4 pb-4 pt-3">
              <Text className="mb-3 text-sm text-muted">Chọn mục tiêu XP mỗi ngày</Text>
              <View className="flex-row gap-2">{XP_PRESETS.map((goal) => <Choice key={goal} label={`${goal}`} selected={settings.dailyXpGoal === goal} onPress={() => void setDailyXpGoal(goal)} />)}</View>
            </View>
          </SettingsDisclosure>

          <SettingsDisclosure
            title="TÙY CHỈNH"
            label="Tùy chỉnh ứng dụng"
            icon={Settings2}
            summary={`${settings.notifyStudy ? 'Nhắc học' : 'Tắt nhắc học'} · ${settings.notifyStreak ? 'Nhắc streak' : 'Tắt streak'} · Chữ ${settings.fontSize} · ${settings.theme === 'light' ? 'Sáng' : 'Tối'}`}
            expanded={expandedPreference === 'custom'}
            onPress={() => setExpandedPreference(expandedPreference === 'custom' ? null : 'custom')}>
            <View className="border-t border-line">
              <SettingsRow icon={Bell} title="Nhắc học" trailing={<Switch value={settings.notifyStudy} onValueChange={(notifyStudy) => void update({ notifyStudy })} trackColor={{ false: colors.line, true: colors.accentSoft }} thumbColor={settings.notifyStudy ? colors.accent : colors.muted} accessibilityLabel="Nhắc học mỗi ngày" />} />
              <SettingsRow icon={Zap} title="Nhắc streak" trailing={<Switch value={settings.notifyStreak} onValueChange={(notifyStreak) => void update({ notifyStreak })} trackColor={{ false: colors.line, true: colors.accentSoft }} thumbColor={settings.notifyStreak ? colors.accent : colors.muted} accessibilityLabel="Nhắc duy trì streak" />} />
              <View className="px-4 pb-4 pt-3">
                <View className="mb-3 flex-row items-center gap-2"><Settings2 size={16} color={colors.muted} /><Text className="text-sm text-muted">Cỡ chữ</Text></View>
                <View className="flex-row gap-2">{FONT_OPTIONS.map((size) => <Choice key={size} label={size} selected={settings.fontSize === size} onPress={() => void update({ fontSize: size })} />)}</View>
              </View>
              <View className="px-4 pb-4">
                <View className="mb-3 flex-row items-center gap-2"><Moon size={16} color={colors.muted} /><Text className="text-sm text-muted">Giao diện</Text></View>
                <View className="flex-row gap-2">{(['light', 'dark'] as const).map((theme) => <Choice key={theme} label={theme === 'light' ? 'Sáng' : 'Tối'} selected={settings.theme === theme} onPress={() => void update({ theme })} />)}</View>
              </View>
            </View>
          </SettingsDisclosure>

          <SettingsGroup title="ỨNG DỤNG">
            <SettingsRow icon={CircleHelp} title="Trợ giúp" onPress={() => void WebBrowser.openBrowserAsync('mailto:support@ieltspath.local')} />
            <SettingsRow icon={Trash2} title="Xóa dữ liệu tạm" onPress={clearCachePrompt} danger busy={busy === 'cache'} />
          </SettingsGroup>

          <Pressable onPress={signOutPrompt} disabled={busy !== null} accessibilityRole="button" className="mt-2 min-h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-surface active:opacity-70">
            {busy === 'signout' ? <ActivityIndicator color={colors.danger} /> : <LogOut size={17} color={colors.danger} />}
            <Text weight="semibold" className="text-sm" style={{ color: colors.danger }}>Đăng xuất</Text>
          </Pressable>
          <Text className="mt-4 text-center text-xs text-muted">IELTSPath · v{APP_VERSION}</Text>
        </>
      ) : null}
    </ScrollView>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return <View className="mb-4">
    <Text weight="bold" className="mb-2 ml-3 text-[11px] tracking-[1.2px] text-muted">{title}</Text>
    <View className="overflow-hidden rounded-2xl border border-line bg-surface">{children}</View>
  </View>;
}

function SettingsDisclosure({ title, label, icon: Icon, summary, expanded, onPress, children }: { title: string; label: string; icon: LucideIcon; summary: string; expanded: boolean; onPress: () => void; children: ReactNode }) {
  return <View className="mb-4">
    <Text weight="bold" className="mb-2 ml-3 text-[11px] tracking-[1.2px] text-muted">{title}</Text>
    <View className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onPress} className="min-h-[68px] flex-row items-center gap-3 px-4 py-3 active:bg-canvas">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent-soft"><Icon size={18} color={colors.accentDeep} /></View>
        <View className="flex-1"><Text weight="semibold" className="text-sm">{label}</Text><Text numberOfLines={1} className="mt-1 text-xs text-muted">{summary}</Text></View>
        <ChevronDown size={18} color={colors.muted} style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }} />
      </Pressable>
      {expanded ? children : null}
    </View>
  </View>;
}

function SettingsRow({ icon: Icon, title, badge, onPress, trailing, danger = false, busy = false }: { icon: LucideIcon; title: string; badge?: number; onPress?: () => void; trailing?: ReactNode; danger?: boolean; busy?: boolean }) {
  const content = <View className="min-h-[56px] flex-row items-center gap-3 px-4 py-2">
    <Icon size={18} color={danger ? colors.danger : colors.accentDeep} />
    <Text weight="medium" className="flex-1 text-sm" style={danger ? { color: colors.danger } : undefined}>{title}</Text>
    {badge && badge > 0 ? <View className="min-w-6 items-center rounded-full px-1.5 py-1" style={{ backgroundColor: colors.accentSoft }}><Text weight="bold" className="text-[10px] text-accent-deep">{badge > 99 ? '99+' : badge}</Text></View> : null}
    {busy ? <ActivityIndicator color={colors.danger} /> : trailing ?? (onPress ? <ChevronRight size={17} color={colors.muted} /> : null)}
  </View>;
  return <View>
    {onPress ? <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} className="active:bg-canvas">{content}</Pressable> : content}
    <View className="ml-[50px] h-px bg-line" />
  </View>;
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} className="min-h-10 flex-1 flex-row items-center justify-center gap-1 rounded-xl" style={{ backgroundColor: selected ? colors.accentSoft : colors.canvas }}>
    {selected ? <Check size={13} color={colors.accentDeep} /> : null}
    <Text weight="bold" className="text-sm" style={{ color: selected ? colors.accentDeep : colors.ink }}>{label}</Text>
  </Pressable>;
}
