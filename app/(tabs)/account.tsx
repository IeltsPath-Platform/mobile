import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { Bell, BookOpen, BookOpenCheck, CalendarDays, Camera, Check, ChevronRight, CircleHelp, Gamepad2, KeyRound, Layers3, LogOut, Moon, Settings2, Sparkles, Target, Trash2, UserRound, UsersRound, Zap } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Platform, Pressable, RefreshControl, ScrollView, Switch, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { useAuth, useCurrentUser } from '@/src/features/auth/auth-provider';
import { communityApi } from '@/src/features/community/api';
import { useUnread } from '@/src/features/community/use-unread';
import { profileApi, profileQueryKeys } from '@/src/features/profile/api';
import { clearAppSettingsStorage, type FontSizeOption, useAppSettings } from '@/src/features/settings/use-app-settings';
import { listActiveDecks, vocabApi } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

const FONT_OPTIONS: FontSizeOption[] = ['S', 'M', 'L'];
const XP_PRESETS = [30, 50, 80, 100] as const;
const APP_VERSION = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';
const PROFILE_SHORTCUTS: { title: string; detail: string; href: string; icon: LucideIcon; color: string; tint: string }[] = [
  { title: 'Chủ đề từ vựng', detail: 'Học theo chủ đề', href: '/(tabs)', icon: BookOpen, color: '#1688dc', tint: '#e8f5ff' },
  { title: 'Flashcards', detail: 'Ôn từ đã lưu', href: '/(tabs)/flashcards', icon: Layers3, color: '#e7773f', tint: '#fff0e8' },
  { title: 'Luyện tập', detail: 'Tiếp tục bài học', href: '/(tabs)/practice', icon: BookOpenCheck, color: '#7b5fd0', tint: '#f0ebff' },
  { title: 'Trò chơi', detail: 'Luyện cùng bạn', href: '/games', icon: Gamepad2, color: '#178f73', tint: '#e5f7f1' },
  { title: 'Cộng đồng', detail: 'Chia sẻ & hỏi đáp', href: '/(tabs)/community', icon: UsersRound, color: '#d76280', tint: '#fff0f3' },
];

export default function AccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authEnabled, signOut } = useAuth();
  const userQuery = useCurrentUser();
  const user = userQuery.data;
  const learnerQuery = useQuery({ queryKey: profileQueryKeys.learner, queryFn: profileApi.getLearnerProfile, enabled: authEnabled && Boolean(user) });
  const topicQuery = useQuery({ queryKey: ['vocab', 'topics'], queryFn: ({ signal }) => vocabApi.listTopics(signal), staleTime: 5 * 60_000 });
  const decksQuery = useQuery({ queryKey: ['flashcards', 'decks'], queryFn: listActiveDecks, enabled: authEnabled && Boolean(user), staleTime: 30_000 });
  const relationshipsQuery = useQuery({ queryKey: ['community', 'relationship', user?.id], queryFn: () => communityApi.relationship(user!.id), enabled: authEnabled && Boolean(user), staleTime: 60_000 });
  const unread = useUnread();
  const { settings, update, setDailyXpGoal } = useAppSettings();
  const [busy, setBusy] = useState<'signout' | 'cache' | null>(null);
  const owlGlow = useRef(new Animated.Value(0)).current;
  const unreadCount = unread.data?.count ?? 0;

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
        else Alert.alert('Đã xóa cache', 'Dữ liệu tạm trên thiết bị đã được xóa.');
      } finally { setBusy(null); }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Xóa cài đặt đã lưu và dữ liệu tạm trên máy?')) void run();
      return;
    }
    Alert.alert('Xóa cache local', 'Xóa cài đặt đã lưu và dữ liệu tạm trên thiết bị?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => void run() },
    ]);
  };

  const refresh = () => { void Promise.all([userQuery.refetch(), learnerQuery.refetch(), unread.refetch(), topicQuery.refetch(), decksQuery.refetch(), relationshipsQuery.refetch()]); };
  const initial = user?.fullName.trim().charAt(0).toUpperCase() || '?';

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="px-5 pb-10 pt-5"
      refreshControl={authEnabled ? <RefreshControl refreshing={userQuery.isRefetching || learnerQuery.isRefetching || topicQuery.isRefetching || decksQuery.isRefetching || relationshipsQuery.isRefetching} onRefresh={refresh} tintColor={colors.accent} /> : undefined}>
      <View className="mb-5 flex-row items-center justify-between">
        <View><Text weight="bold" className="text-xs uppercase tracking-[1.5px] text-accent-deep">IELTSPATH</Text><Text weight="black" className="mt-1 text-2xl">Hồ sơ của bạn</Text></View>
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft"><Sparkles size={18} color={colors.accentDeep} /></View>
      </View>

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
          <View className="mb-5 min-h-[230px] overflow-hidden rounded-[30px] px-5 py-5" style={{ backgroundColor: colors.heroStart }}>
            <Animated.View className="absolute -right-8 -top-10 h-44 w-44 rounded-full" style={{ backgroundColor: `${colors.accent}35`, opacity: owlGlow.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] }), transform: [{ scale: owlGlow.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) }] }} />
            <View className="absolute right-28 top-8 h-3 w-3 rounded-full" style={{ backgroundColor: '#f8d783' }} />
            <View className="absolute right-16 top-16 h-2 w-2 rounded-full bg-white" />
            <View className="absolute bottom-0 left-0 right-0 h-16" style={{ backgroundColor: `${colors.heroEnd}65` }} />
            <View className="z-10 flex-1 pr-24">
              <Text weight="bold" className="text-xs uppercase tracking-[1.5px]" style={{ color: '#b8d7ff' }}>GÓC HỌC TẬP</Text>
              <Text weight="black" className="mt-2 text-2xl leading-8 text-white" numberOfLines={2}>{learnerQuery.data?.displayName || user.fullName}</Text>
              <Text className="mt-1 text-sm text-white/75" numberOfLines={1}>{user.email}</Text>
              <Pressable onPress={() => router.push('/profile/edit' as never)} accessibilityRole="button" className="mt-4 min-h-10 flex-row items-center self-start gap-2 rounded-full px-4" style={{ backgroundColor: '#ffffff20' }}>
                <Camera size={14} color="#fff" /><Text weight="bold" className="text-xs text-white">Chỉnh sửa hồ sơ</Text><ChevronRight size={14} color="#fff" />
              </Pressable>
            </View>
            <Image source={require('@/assets/images/owl/hero-cheer.webp')} resizeMode="contain" accessibilityLabel="Cú IELTSPath đang cổ vũ bạn" className="absolute bottom-0 right-0 h-[190px] w-[170px]" />
            <View className="absolute right-7 top-14"><Sparkles size={17} color="#ffdb7d" /></View>
            <View className="absolute bottom-16 right-[145px]"><Sparkles size={12} color="#fff" /></View>
          </View>

          <View className="mb-6 overflow-hidden rounded-[26px] border border-line bg-surface p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View><Text weight="black" className="text-lg">Góc học tập của bạn</Text><Text className="mt-1 text-xs text-muted">Dữ liệu đồng bộ từ tài khoản</Text></View>
              <Sparkles size={19} color={colors.accentWarm} />
            </View>
            <View className="flex-row gap-2.5">
              <ProfileMetric label="Chủ đề" value={topicQuery.isError ? '—' : topicQuery.data?.length ?? '…'} icon={BookOpen} tint="#e8f5ff" color="#1688dc" />
              <ProfileMetric label="Bộ thẻ" value={decksQuery.isError ? '—' : decksQuery.data?.length ?? '…'} icon={Layers3} tint="#fff0e8" color="#e7773f" />
              <ProfileMetric label="Thông báo" value={unread.error ? '—' : unreadCount} icon={Bell} tint="#fff0f3" color="#d76280" />
            </View>
            {topicQuery.isError || decksQuery.isError || unread.error ? <Text className="mt-3 text-xs text-danger">Một số số liệu chưa tải được. Kéo xuống để thử lại.</Text> : null}
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/community' as never)} className="mb-6 overflow-hidden rounded-[26px] border border-line bg-surface p-4 active:opacity-80">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: '#d7628020' }}><UsersRound size={22} color="#d76280" /></View>
              <View className="flex-1"><Text weight="black" className="text-base">Cộng đồng học tập</Text><Text className="mt-1 text-xs text-muted">Kết nối với những người cùng học IELTS</Text></View>
              <ChevronRight size={18} color={colors.muted} />
            </View>
            <View className="mt-4 flex-row rounded-2xl" style={{ backgroundColor: colors.canvas }}>
              <View className="flex-1 items-center border-r border-line py-3"><Text weight="black" className="text-lg text-accent">{relationshipsQuery.data?.followerCount ?? '—'}</Text><Text className="mt-0.5 text-[10px] text-muted">Người theo dõi</Text></View>
              <View className="flex-1 items-center py-3"><Text weight="black" className="text-lg" style={{ color: '#d76280' }}>{relationshipsQuery.data?.followingCount ?? '—'}</Text><Text className="mt-0.5 text-[10px] text-muted">Đang theo dõi</Text></View>
            </View>
          </Pressable>

          <View className="mb-6">
            <View className="mb-3 flex-row items-end justify-between">
              <View><Text weight="black" className="text-lg">Khám phá IELTSPath</Text><Text className="mt-1 text-xs text-muted">Mở nhanh các hoạt động đang có</Text></View>
              <Sparkles size={18} color={colors.accentWarm} />
            </View>
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {PROFILE_SHORTCUTS.map(({ title, detail, href, icon: Icon, color, tint }) => (
                <Pressable key={title} accessibilityRole="button" accessibilityLabel={`${title}: ${detail}`} onPress={() => router.push(href as never)} className="min-h-[106px] w-[48.5%] justify-between rounded-[22px] border border-line bg-surface p-3.5 active:opacity-75">
                  <View className="flex-row items-start justify-between">
                    <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: tint }}><Icon size={20} color={color} /></View>
                    <ChevronRight size={16} color={colors.muted} />
                  </View>
                  <View><Text weight="extrabold" className="text-sm">{title}</Text><Text className="mt-0.5 text-[11px] text-muted">{detail}</Text></View>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="mb-6 flex-row gap-3">
            <View className="min-h-[92px] flex-1 justify-center rounded-2xl border border-line bg-surface px-4 py-3">
              <View className="mb-2 flex-row items-center gap-2"><Target size={15} color={colors.accentDeep} /><Text className="text-xs text-muted">Mục tiêu IELTS</Text></View>
              <Text weight="extrabold" className="text-base">{learnerQuery.data?.selfReportedBand != null ? `Band ${learnerQuery.data.selfReportedBand}` : 'Chưa cập nhật'}</Text>
            </View>
            <View className="min-h-[92px] flex-1 justify-center rounded-2xl border border-line bg-surface px-4 py-3">
              <View className="mb-2 flex-row items-center gap-2"><CalendarDays size={15} color={colors.accentDeep} /><Text className="text-xs text-muted">Thành viên từ</Text></View>
              <Text weight="extrabold" className="text-base">{learnerQuery.data?.createdAt ? new Date(learnerQuery.data.createdAt).toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }) : '—'}</Text>
            </View>
          </View>
          {learnerQuery.isError ? <Pressable onPress={() => void learnerQuery.refetch()} className="-mt-3 mb-4"><Text className="text-xs text-muted">Không tải được ảnh hồ sơ · Chạm để thử lại</Text></Pressable> : null}

          <SettingsGroup title="TÀI KHOẢN">
            <SettingsRow icon={KeyRound} title="Đổi mật khẩu" onPress={() => router.push('/profile/change-password' as never)} />
          </SettingsGroup>

          <SettingsGroup title="HỌC TẬP & CỘNG ĐỒNG">
            <SettingsRow icon={BookOpen} title="Tiến độ học tập" onPress={() => router.push('/progress' as never)} />
            <SettingsRow icon={Bell} title="Thông báo" badge={unreadCount} onPress={openNotifications} />
            <SettingsRow icon={Settings2} title="Cài đặt thông báo" onPress={() => router.push('/community/notification-preferences' as never)} />
          </SettingsGroup>

          <SettingsGroup title="MỤC TIÊU HỌC">
            <View className="px-4 pb-4 pt-3">
              <View className="mb-3 flex-row items-center gap-2"><Zap size={16} color={colors.xpDeep} /><Text className="text-sm text-muted">XP mỗi ngày · {settings.dailyXpGoal} XP</Text></View>
              <View className="flex-row gap-2">{XP_PRESETS.map((goal) => <Choice key={goal} label={`${goal}`} selected={settings.dailyXpGoal === goal} onPress={() => void setDailyXpGoal(goal)} />)}</View>
            </View>
          </SettingsGroup>

          <SettingsGroup title="TÙY CHỈNH">
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
          </SettingsGroup>

          <SettingsGroup title="ỨNG DỤNG">
            <SettingsRow icon={CircleHelp} title="Trợ giúp" onPress={() => void WebBrowser.openBrowserAsync('mailto:support@ieltspath.local')} />
            <SettingsRow icon={Trash2} title="Xóa cache local" onPress={clearCachePrompt} danger busy={busy === 'cache'} />
          </SettingsGroup>

          <Pressable onPress={signOutPrompt} disabled={busy !== null} accessibilityRole="button" className="mt-5 min-h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-surface active:opacity-70">
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

function SettingsRow({ icon: Icon, title, value, badge, onPress, trailing, danger = false, busy = false }: { icon: LucideIcon; title: string; value?: string; badge?: number; onPress?: () => void; trailing?: ReactNode; danger?: boolean; busy?: boolean }) {
  const content = <View className="min-h-[52px] flex-row items-center gap-3 px-4 py-2">
    <Icon size={18} color={danger ? colors.danger : colors.accentDeep} />
    <Text weight="medium" className="flex-1 text-sm" style={danger ? { color: colors.danger } : undefined}>{title}</Text>
    {value ? <Text className="text-sm text-muted">{value}</Text> : null}
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

function ProfileMetric({ label, value, icon: Icon, tint, color }: { label: string; value: string | number; icon: LucideIcon; tint: string; color: string }) {
  return <View className="min-w-0 flex-1 items-center rounded-2xl px-2 py-3" style={{ backgroundColor: tint }}>
    <Icon size={17} color={color} />
    <Text weight="black" className="mt-1 text-xl" style={{ color }}>{value}</Text>
    <Text className="mt-0.5 text-[10px] text-muted" numberOfLines={1}>{label}</Text>
  </View>;
}
