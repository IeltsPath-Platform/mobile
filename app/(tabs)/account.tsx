import Constants from 'expo-constants';
import {
  Bell,
  BookOpen,
  Camera,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Flame,
  KeyRound,
  LogOut,
  Moon,
  Settings2,
  Sparkles,
  Sun,
  Trash2,
  Trophy,
  UserRound,
  UsersRound,
  Volume2,
  Zap,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  View,
  type ScrollViewInstance,
} from 'react-native';
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
import {
  clearAppSettingsStorage,
  type FontSizeOption,
  useAppSettings,
} from '@/src/features/settings/use-app-settings';
import { vocabApi } from '@/src/features/vocab/api';
import { studyKeys, vocabularyStudyApi } from '@/src/features/vocab/study-api';
import { haptics } from '@/src/lib/haptics';
import { sound } from '@/src/lib/sound';
import { colors } from '@/src/theme';

const FONT_OPTIONS: FontSizeOption[] = ['S', 'M', 'L'];
const XP_PRESETS = [30, 50, 80, 100] as const;
const APP_VERSION = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';

type ExpandableSection = 'goal' | 'settings' | null;

export default function AccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authEnabled, signOut } = useAuth();
  const userQuery = useCurrentUser();
  const user = userQuery.data;

  const learnerQuery = useQuery({
    queryKey: profileQueryKeys.learner,
    queryFn: profileApi.getLearnerProfile,
    enabled: authEnabled && Boolean(user),
  });

  const relationshipsQuery = useQuery({
    queryKey: ['community', 'relationship', user?.id],
    queryFn: () => communityApi.relationship(user!.id),
    enabled: authEnabled && Boolean(user),
    staleTime: 60_000,
  });

  const achievementsQuery = useQuery({
    queryKey: ['vocab', 'achievements'],
    queryFn: () => vocabApi.achievements(),
    enabled: authEnabled && Boolean(user),
    staleTime: 60_000,
  });

  const studySummary = useQuery({
    queryKey: studyKeys.summary,
    queryFn: ({ signal }) => vocabularyStudyApi.summary(signal),
    enabled: authEnabled && Boolean(user),
    staleTime: 30_000,
    retry: 1,
  });
  const unread = useUnread();
  const { settings, update, setDailyXpGoal } = useAppSettings();

  const [busy, setBusy] = useState<'signout' | 'cache' | null>(null);
  const [expandedSection, setExpandedSection] = useState<ExpandableSection>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);

  useFocusEffect(
    useCallback(() => () => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  const toggleSection = (section: ExpandableSection) => {
    haptics.tap();
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const openNotifications = () => {
    void queryClient.invalidateQueries({ queryKey: ['community', 'notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['community', 'unread'] });
    router.push('/community/notifications' as never);
  };

  const signOutPrompt = () => {
    const run = async () => {
      setBusy('signout');
      try {
        await signOut();
      } catch (error) {
        haptics.error();
        Alert.alert(
          'Không đăng xuất được',
          error instanceof Error ? error.message : 'Vui lòng thử lại.',
        );
      } finally {
        setBusy(null);
      }
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
        haptics.success();
        if (Platform.OS === 'web') window.alert('Đã xóa dữ liệu tạm trên máy.');
        else Alert.alert('Đã xóa dữ liệu tạm', 'Cài đặt ứng dụng đã được đặt lại.');
      } catch (error) {
        haptics.error();
        Alert.alert(
          'Không xóa được dữ liệu tạm',
          error instanceof Error ? error.message : 'Vui lòng thử lại.',
        );
      } finally {
        setBusy(null);
      }
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

  const displayName = learnerQuery.data?.displayName || user?.fullName || 'Học viên';
  const band = learnerQuery.data?.selfReportedBand != null ? `Band ${learnerQuery.data.selfReportedBand}` : null;
  const streakDays = studySummary.data?.streak.currentDays ?? (studySummary.isPending ? '…' : '—');
  const totalXp = studySummary.data?.xp.totalXp ?? (studySummary.isPending ? '…' : '—');
  const followersCount = relationshipsQuery.data?.followerCount ?? (relationshipsQuery.isPending ? '…' : '—');
  const achievementItems = achievementsQuery.data?.items;
  const completedAchievements = achievementItems?.filter((item) => item.achieved).length;
  const hasSummaryError = learnerQuery.isError || relationshipsQuery.isError || achievementsQuery.isError || studySummary.isError;
  const retrySummary = () => {
    if (learnerQuery.isError) void learnerQuery.refetch();
    if (relationshipsQuery.isError) void relationshipsQuery.refetch();
    if (achievementsQuery.isError) void achievementsQuery.refetch();
    if (studySummary.isError) void studySummary.refetch();
  };

  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1 bg-canvas"
      contentContainerClassName="px-4 pb-12 pt-2"
      showsVerticalScrollIndicator={false}
      refreshControl={
        authEnabled ? (
          <RefreshControl
            refreshing={
              userQuery.isRefetching ||
              learnerQuery.isRefetching ||
              relationshipsQuery.isRefetching ||
              achievementsQuery.isRefetching ||
              studySummary.isRefetching ||
              unread.isRefetching
            }
            onRefresh={() => {
              void userQuery.refetch();
              void learnerQuery.refetch();
              void relationshipsQuery.refetch();
              void achievementsQuery.refetch();
              void studySummary.refetch();
              void unread.refetch();
            }}
            tintColor={colors.accent}
          />
        ) : undefined
      }
    >
      {/* 1. TOP HEADER TITLE */}
      <View className="mb-3.5 flex-row items-center justify-between px-1 pt-1">
        <Text accessibilityRole="header" weight="black" className="text-[23px] text-ink">
          Hồ sơ
        </Text>
        {authEnabled && user ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xem thông báo"
            onPress={openNotifications}
            className="relative h-11 w-11 items-center justify-center rounded-full bg-surface border border-line active:opacity-75"
          >
            <Bell size={18} color={colors.ink} />
            {(unread.data?.count ?? 0) > 0 ? (
              <View className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 items-center justify-center rounded-full bg-danger">
                <Text weight="black" className="text-[8px] text-white">
                  {(unread.data?.count ?? 0) > 9 ? '9+' : unread.data?.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>

      {!authEnabled ? (
        <Card className="items-center rounded-3xl p-6">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
            <UserRound size={26} color={colors.accentDeep} />
          </View>
          <Text weight="black" className="mt-3 text-lg text-ink">
            Đăng nhập để xem hồ sơ
          </Text>
          <Text className="mt-1 text-center text-xs text-muted">
            Theo dõi chuỗi học, XP và đồng bộ tiến độ học tập.
          </Text>
          <Button
            className="mt-4 w-full"
            label="Đăng nhập ngay"
            onPress={() => router.push('/(auth)/login' as never)}
          />
        </Card>
      ) : userQuery.isPending ? (
        <View className="my-14 items-center gap-2">
          <ActivityIndicator color={colors.accent} />
          <Text className="text-xs text-muted">Đang tải thông tin hồ sơ…</Text>
        </View>
      ) : userQuery.isError && !user ? (
        <View className="gap-3">
          <FormAlert message={userQuery.error.message} />
          <Button variant="secondary" label="Thử lại" onPress={() => void userQuery.refetch()} />
        </View>
      ) : user ? (
        <>
          {/* 2. PROFILE SUMMARY & STATS CARD */}
          <View
            className="mb-4 overflow-hidden rounded-3xl border border-line bg-surface p-4"
            style={{
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            {/* User row */}
            <View className="flex-row items-center gap-3.5">
              <View className="relative">
                <View
                  className="h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-accent"
                  style={{ backgroundColor: colors.accentSoft }}
                >
                  <Image
                    source={learnerQuery.data?.avatarReference ? { uri: learnerQuery.data.avatarReference } : require('@/assets/images/owl/nav-owl-stand.webp')}
                    accessibilityLabel="Avatar học viên"
                    className={learnerQuery.data?.avatarReference ? 'h-full w-full' : 'h-11 w-11'}
                    resizeMode={learnerQuery.data?.avatarReference ? 'cover' : 'contain'}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Chỉnh sửa ảnh"
                  hitSlop={10}
                  onPress={() => router.push('/profile/edit' as never)}
                  className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border border-line bg-surface shadow-sm active:opacity-75"
                >
                  <Camera size={11} color={colors.accentDeep} />
                </Pressable>
              </View>

              <View className="flex-1 pr-1">
                <View className="flex-row items-center gap-2">
                  <Text weight="black" className="flex-1 text-lg text-ink" numberOfLines={1}>
                    {displayName}
                  </Text>
                  {band ? (
                    <View className="rounded-full bg-accent-soft px-2 py-0.5">
                      <Text weight="black" className="text-[10px] text-accent-deep">
                        {band}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
                  {user.email}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chỉnh sửa hồ sơ"
                onPress={() => router.push('/profile/edit' as never)}
                className="min-h-11 justify-center rounded-xl border border-line bg-canvas px-3 py-1.5 active:opacity-75"
              >
                <Text weight="bold" className="text-xs text-accent-deep">
                  Sửa
                </Text>
              </Pressable>
            </View>

            {/* Core Stats Bar: 3 Clean Metrics */}
            <View className="mt-3.5 flex-row items-center rounded-2xl border border-line bg-canvas divide-x divide-line py-2.5">
              {/* Streak */}
              <View className="flex-1 items-center">
                <View className="flex-row items-center gap-1">
                  <Flame size={15} color={colors.flame} />
                  <Text weight="black" className="text-base text-ink">
                    {streakDays}
                  </Text>
                </View>
                <Text className="text-[10px] text-muted font-medium mt-0.5">
                  Ngày streak
                </Text>
              </View>

              {/* Total XP */}
              <View className="flex-1 items-center">
                <View className="flex-row items-center gap-1">
                  <Sparkles size={15} color={colors.coin} />
                  <Text weight="black" className="text-base text-ink">
                    {totalXp}
                  </Text>
                </View>
                <Text className="text-[10px] text-muted font-medium mt-0.5">
                  Tổng XP
                </Text>
              </View>

              {/* Community Followers */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xem hồ sơ cộng đồng và người theo dõi"
                onPress={() =>
                  router.push(
                    user?.id
                      ? (`/community/users/${user.id}` as never)
                      : ('/(tabs)/community' as never),
                  )
                }
                className="flex-1 items-center active:opacity-70"
              >
                <View className="flex-row items-center gap-1">
                  <UsersRound size={15} color={colors.social} />
                  <Text weight="black" className="text-base text-ink">
                    {followersCount}
                  </Text>
                </View>
                <Text className="text-[10px] text-muted font-medium mt-0.5">
                  Người theo dõi
                </Text>
              </Pressable>
            </View>
          </View>

          {hasSummaryError ? (
            <View className="mb-4 gap-2">
              <Text className="text-xs text-danger">Chưa tải được một phần thông tin hồ sơ.</Text>
              <Button variant="secondary" label="Tải lại thông tin" onPress={retrySummary} />
            </View>
          ) : null}

          {/* 4. SETTINGS GROUPS */}

          {/* NHÓM 1: HỌC TẬP & THÀNH TÍCH */}
          <SettingsSection title="HỌC TẬP">
            {/* Mục tiêu XP mỗi ngày (Sổ ra để chọn) */}
            <SettingsAccordionRow
              icon={Zap}
              title="Mục tiêu học mỗi ngày"
              summary={`${settings.dailyXpGoal} XP / ngày`}
              expanded={expandedSection === 'goal'}
              onToggle={() => toggleSection('goal')}
            >
              <View className="px-4 py-3 bg-canvas/40">
                <Text className="mb-2 text-xs text-muted">
                  Chọn số XP bạn muốn đạt được mỗi ngày:
                </Text>
                <View className="flex-row gap-2">
                  {XP_PRESETS.map((preset) => (
                    <Pressable
                      key={preset}
                      accessibilityRole="radio"
                      accessibilityLabel={`${preset} XP mỗi ngày`}
                      accessibilityState={{ checked: settings.dailyXpGoal === preset }}
                      onPress={() => void setDailyXpGoal(preset)}
                      className="min-h-11 flex-1 items-center justify-center rounded-xl py-2 border active:opacity-75"
                      style={{
                        backgroundColor:
                          settings.dailyXpGoal === preset
                            ? colors.accentSoft
                            : colors.surface,
                        borderColor: settings.dailyXpGoal === preset ? colors.accent : colors.line,
                      }}
                    >
                      <Text
                        weight="black"
                        className="text-xs"
                        style={{
                          color: settings.dailyXpGoal === preset ? colors.accentDeep : colors.ink,
                        }}
                      >
                        {preset} XP
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </SettingsAccordionRow>

            <SettingsLinkRow
              icon={BookOpen}
              title="Tiến độ học tập chi tiết"
              onPress={() => router.push('/progress' as never)}
            />

            <SettingsLinkRow
              icon={Trophy}
              title="Thành tích & Huy hiệu"
              badgeText={achievementItems ? `${completedAchievements}/${achievementItems.length}` : undefined}
              onPress={() => router.push('/achievements' as never)}
              isLast
            />
          </SettingsSection>

          {/* NHÓM 2: CẤU HÌNH & THÔNG BÁO (GỘP CHUNG 1 CHỖ, BẤM VÀO SỔ RA ĐỂ BẬT/TẮT) */}
          <SettingsSection title="CÀI ĐẶT ỨNG DỤNG">
            <SettingsAccordionRow
              icon={Settings2}
              title="Cài đặt & Cấu hình"
              expanded={expandedSection === 'settings'}
              onToggle={() => toggleSection('settings')}
              isLast
            >
              <View className="bg-canvas/40 pb-1">
                {/* 1. Tiểu mục Thông báo */}
                <View className="px-4 pt-3 pb-1.5 flex-row items-center gap-1.5">
                  <Bell size={13} color={colors.accentDeep} />
                  <Text weight="black" className="text-[11px] uppercase tracking-wider text-accent-deep">
                    Thông báo & Nhắc nhở
                  </Text>
                </View>

                <SettingsToggleItem
                  title="Nhắc nhở học tập mỗi ngày"
                  value={settings.notifyStudy}
                  onChange={(val) => {
                    haptics.select();
                    void update({ notifyStudy: val });
                  }}
                />
                <SettingsToggleItem
                  title="Nhắc nhở giữ chuỗi Streak"
                  value={settings.notifyStreak}
                  onChange={(val) => {
                    haptics.select();
                    void update({ notifyStreak: val });
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/community/notification-preferences' as never)}
                  className="flex-row items-center justify-between px-4 py-2.5 active:bg-canvas border-b border-line/60"
                >
                  <Text weight="bold" className="text-sm text-ink">
                    Thông báo cộng đồng
                  </Text>
                  <ChevronRight size={14} color={colors.accentDeep} />
                </Pressable>

                {/* 2. Tiểu mục Âm thanh & Giao diện */}
                <View className="px-4 pt-3.5 pb-1.5 flex-row items-center gap-1.5">
                  <Volume2 size={13} color={colors.accentDeep} />
                  <Text weight="black" className="text-[11px] uppercase tracking-wider text-accent-deep">
                    Âm thanh & Hiển thị
                  </Text>
                </View>

                <SettingsToggleItem
                  title="Âm thanh & phát âm bài học"
                  value={settings.soundEnabled}
                  onChange={(val) => {
                    haptics.select();
                    void update({ soundEnabled: val });
                    if (val) void sound.play('tap');
                  }}
                />
                <SettingsToggleItem
                  title="Nhạc nền khi học bài"
                  value={settings.musicEnabled}
                  onChange={(val) => {
                    haptics.select();
                    void update({ musicEnabled: val });
                  }}
                />

                {/* Chế độ Sáng / Tối */}
                <View className="flex-row items-center justify-between px-4 py-2.5 border-b border-line/60">
                  <Text weight="bold" className="text-xs text-ink">
                    Giao diện ứng dụng
                  </Text>
                  <View className="flex-row rounded-xl border border-line bg-surface p-0.5">
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityLabel="Giao diện sáng"
                      accessibilityState={{ checked: settings.theme === 'light' }}
                      onPress={() => void update({ theme: 'light' })}
                      className="min-h-11 flex-row items-center gap-1 rounded-lg px-2.5 py-1"
                      style={{
                        backgroundColor:
                          settings.theme === 'light' ? colors.canvas : 'transparent',
                      }}
                    >
                      <Sun size={12} color={settings.theme === 'light' ? colors.coin : colors.muted} />
                      <Text
                        weight="bold"
                        className="text-xs"
                        style={{
                          color: settings.theme === 'light' ? colors.ink : colors.muted,
                        }}
                      >
                        Sáng
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityLabel="Giao diện tối"
                      accessibilityState={{ checked: settings.theme === 'dark' }}
                      onPress={() => void update({ theme: 'dark' })}
                      className="min-h-11 flex-row items-center gap-1 rounded-lg px-2.5 py-1"
                      style={{
                        backgroundColor:
                          settings.theme === 'dark' ? colors.canvas : 'transparent',
                      }}
                    >
                      <Moon size={12} color={settings.theme === 'dark' ? colors.accent : colors.muted} />
                      <Text
                        weight="bold"
                        className="text-xs"
                        style={{
                          color: settings.theme === 'dark' ? colors.ink : colors.muted,
                        }}
                      >
                        Tối
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Chọn Cỡ chữ */}
                <View className="flex-row items-center justify-between px-4 py-2.5">
                  <Text weight="bold" className="text-xs text-ink">
                    Cỡ chữ hiển thị
                  </Text>
                  <View className="flex-row gap-1.5">
                    {FONT_OPTIONS.map((size) => (
                      <Pressable
                        key={size}
                        accessibilityRole="radio"
                        accessibilityLabel={`Cỡ chữ ${size === 'S' ? 'nhỏ' : size === 'M' ? 'vừa' : 'lớn'}`}
                        accessibilityState={{ checked: settings.fontSize === size }}
                        onPress={() => void update({ fontSize: size })}
                        className="h-11 w-11 items-center justify-center rounded-lg border active:opacity-75"
                        style={{
                          backgroundColor:
                            settings.fontSize === size
                              ? colors.accentSoft
                              : colors.surface,
                          borderColor: settings.fontSize === size ? colors.accent : colors.line,
                        }}
                      >
                        <Text
                          weight="black"
                          className="text-[11px]"
                          style={{
                            color: settings.fontSize === size ? colors.accentDeep : colors.muted,
                          }}
                        >
                          {size}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </SettingsAccordionRow>
          </SettingsSection>

          {/* NHÓM 3: TÀI KHOẢN & HỖ TRỢ */}
          <SettingsSection title="TÀI KHOẢN">
            <SettingsLinkRow
              icon={KeyRound}
              title="Đổi mật khẩu"
              onPress={() => router.push('/profile/change-password' as never)}
            />

            <SettingsLinkRow
              icon={CircleHelp}
              title="Trợ giúp & Hỗ trợ"
              onPress={() =>
                void Linking.openURL('mailto:theenglishspace01@gmail.com').catch(() =>
                  Alert.alert('Không mở được email', 'Hãy gửi tới theenglishspace01@gmail.com.'),
                )
              }
            />

            <SettingsLinkRow
              icon={Trash2}
              title="Xóa dữ liệu tạm"
              danger
              busy={busy === 'cache'}
              onPress={clearCachePrompt}
              isLast
            />
          </SettingsSection>

          {/* 5. LOGOUT BUTTON (Clean & Elegant) */}
          <Pressable
            onPress={signOutPrompt}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel="Đăng xuất"
            className="mt-1 min-h-12 flex-row items-center justify-center gap-2 rounded-2xl border active:opacity-75"
            style={{
              backgroundColor: colors.dangerSoft,
              borderColor: colors.danger,
            }}
          >
            {busy === 'signout' ? (
              <ActivityIndicator color={colors.danger} size="small" />
            ) : (
              <LogOut size={16} color={colors.danger} />
            )}
            <Text weight="black" className="text-xs" style={{ color: colors.danger }}>
              Đăng xuất
            </Text>
          </Pressable>

          <Text className="mt-4 text-center text-[11px] text-muted">
            IELTSPath · Phiên bản {APP_VERSION}
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-4">
      <Text weight="black" className="mb-1.5 ml-2 text-[10px] uppercase tracking-wider text-muted">
        {title}
      </Text>
      <View className="overflow-hidden rounded-2xl border border-line bg-surface">
        {children}
      </View>
    </View>
  );
}

/**
 * Expandable Accordion Row for grouped settings.
 * Collapsed by default to keep the screen ultra clean.
 * Expands smoothly to allow toggling switches or choosing options.
 */
function SettingsAccordionRow({
  icon: Icon,
  title,
  summary,
  expanded,
  onToggle,
  children,
  isLast = false,
}: {
  icon: LucideIcon;
  title: string;
  summary?: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  isLast?: boolean;
}) {
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        className="min-h-[52px] flex-row items-center gap-3 px-4 py-2.5 active:bg-canvas"
      >
        <Icon size={18} color={colors.accentDeep} />
        <View className="flex-1 pr-2">
          <Text weight="bold" className="text-sm text-ink" numberOfLines={1}>
            {title}
          </Text>
          {summary ? (
            <Text className="text-[11px] text-muted mt-0.5" numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <ChevronDown
          size={16}
          color={colors.muted}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {expanded ? <View className="border-t border-line">{children}</View> : null}
      {!isLast ? <View className="ml-4 h-px bg-line" /> : null}
    </View>
  );
}

function SettingsToggleItem({
  title,
  value,
  onChange,
}: {
  title: string;
  value: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <View className="min-h-[46px] flex-row items-center justify-between px-4 py-2 border-b border-line/60">
      <Text weight="medium" className="text-xs text-ink flex-1 pr-2">
        {title}
      </Text>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.line, true: colors.accentSoft }}
        thumbColor={value ? colors.accent : colors.muted}
      />
    </View>
  );
}

function SettingsLinkRow({
  icon: Icon,
  title,
  badgeText,
  danger = false,
  busy = false,
  isLast = false,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  badgeText?: string;
  danger?: boolean;
  busy?: boolean;
  isLast?: boolean;
  onPress: () => void;
}) {
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={onPress}
        className="min-h-[50px] flex-row items-center gap-3 px-4 py-2.5 active:bg-canvas"
      >
        <Icon size={18} color={danger ? colors.danger : colors.accentDeep} />
        <Text
          weight="bold"
          className="flex-1 text-sm text-ink"
          style={danger ? { color: colors.danger } : undefined}
        >
          {title}
        </Text>
        {badgeText ? (
          <View className="rounded-full bg-accent-soft px-2 py-0.5">
            <Text weight="black" className="text-[10px] text-accent-deep">
              {badgeText}
            </Text>
          </View>
        ) : null}
        {busy ? (
          <ActivityIndicator color={colors.danger} size="small" />
        ) : (
          <ChevronRight size={16} color={colors.muted} />
        )}
      </Pressable>
      {!isLast ? <View className="ml-4 h-px bg-line" /> : null}
    </View>
  );
}
