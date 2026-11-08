import Constants from 'expo-constants';
import { Image } from 'expo-image';
import {
  Bell,
  BookOpen,
  Camera,
  CircleHelp,
  Flame,
  KeyRound,
  LogOut,
  Settings2,
  Sparkles,
  Trash2,
  Trophy,
  UserRound,
  UsersRound,
  Zap,
} from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
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
import { AppSettingsPanel } from '@/src/features/settings/components/app-settings-panel';
import {
  SettingsAccordionRow,
  SettingsLinkRow,
  SettingsSection,
} from '@/src/features/settings/components/settings-rows';
import { clearAppSettingsStorage, useAppSettings } from '@/src/features/settings/use-app-settings';
import { vocabApi } from '@/src/features/vocab/api';
import { studyKeys, vocabularyStudyApi } from '@/src/features/vocab/study-api';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';
import { useTabBarScrollHandler, useTabReselect } from '@/src/components/navigation/tab-reselect-context';

const XP_PRESETS = [30, 50, 80, 100] as const;
const APP_VERSION = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';
const SUPPORT_EMAIL = 'theenglishspace01@gmail.com';
const OWL_AVATAR = require('@/assets/images/owl/nav-owl-stand.webp');

type ExpandableSection = 'goal' | 'settings' | null;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Vui lòng thử lại.';
}

export default function AccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authEnabled, signOut } = useAuth();
  const userQuery = useCurrentUser();
  const user = userQuery.data;
  const signedIn = authEnabled && Boolean(user);

  const learnerQuery = useQuery({
    queryKey: profileQueryKeys.learner,
    queryFn: profileApi.getLearnerProfile,
    enabled: signedIn,
  });

  const relationshipsQuery = useQuery({
    queryKey: ['community', 'relationship', user?.id],
    queryFn: () => communityApi.relationship(user!.id),
    enabled: signedIn,
    staleTime: 60_000,
  });

  const achievementsQuery = useQuery({
    queryKey: ['vocab', 'achievements'],
    queryFn: () => vocabApi.achievements(),
    enabled: signedIn,
    staleTime: 60_000,
  });

  const studySummary = useQuery({
    queryKey: studyKeys.summary,
    queryFn: ({ signal }) => vocabularyStudyApi.summary(signal),
    enabled: signedIn,
    staleTime: 30_000,
    retry: 1,
  });
  const unread = useUnread();
  const { settings, setDailyXpGoal } = useAppSettings();

  const [busy, setBusy] = useState<'signout' | 'cache' | null>(null);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [tabRefreshing, setTabRefreshing] = useState(false);
  const [expandedSection, setExpandedSection] = useState<ExpandableSection>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const refreshPrimed = useRef(false);
  const handleTabBarScroll = useTabBarScrollHandler();

  const profileKeys = useMemo(
    () =>
      [
        profileQueryKeys.user,
        profileQueryKeys.learner,
        ['community', 'relationship', user?.id],
        ['vocab', 'achievements'],
        studyKeys.summary,
        ['community', 'unread'],
      ] as const,
    [user?.id],
  );

  // Refresh stale profile sections in the background; keep cached content and
  // the current scroll position while the user visits another screen.
  useFocusEffect(
    useCallback(() => {
      refreshPrimed.current = false;
      for (const queryKey of profileKeys) {
        void queryClient.refetchQueries({ queryKey, type: 'active', stale: true });
      }
    }, [queryClient, profileKeys]),
  );

  const refreshProfileFromTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (!refreshPrimed.current) {
      refreshPrimed.current = true;
      return;
    }

    refreshPrimed.current = false;
    setExpandedSection(null);
    setTabRefreshing(true);
    void Promise.all(
      profileKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey, refetchType: 'active' })),
    ).finally(() => setTabRefreshing(false));
  }, [queryClient, profileKeys]);

  useTabReselect('account', refreshProfileFromTop);

  const refreshProfileByPull = async () => {
    setPullRefreshing(true);
    try {
      await Promise.all([
        userQuery.refetch(),
        learnerQuery.refetch(),
        relationshipsQuery.refetch(),
        achievementsQuery.refetch(),
        studySummary.refetch(),
        unread.refetch(),
      ]);
    } finally {
      setPullRefreshing(false);
    }
  };

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
        Alert.alert('Không đăng xuất được', errorMessage(error));
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
        Alert.alert('Không xóa được dữ liệu tạm', errorMessage(error));
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
  const avatarReference = learnerQuery.data?.avatarReference;
  const band = learnerQuery.data?.selfReportedBand != null ? `Band ${learnerQuery.data.selfReportedBand}` : null;
  const streakDays = studySummary.data?.streak.currentDays ?? (studySummary.isPending ? '…' : '—');
  const totalXp = studySummary.data?.xp.totalXp ?? (studySummary.isPending ? '…' : '—');
  const followersCount = relationshipsQuery.data?.followerCount ?? (relationshipsQuery.isPending ? '…' : '—');
  const achievementItems = achievementsQuery.data?.items;
  const completedAchievements = achievementItems?.filter((item) => item.achieved).length ?? 0;
  const unreadCount = unread.data?.count ?? 0;
  const hasSummaryError =
    learnerQuery.isError || relationshipsQuery.isError || achievementsQuery.isError || studySummary.isError;
  const retrySummary = () => {
    if (learnerQuery.isError) void learnerQuery.refetch();
    if (relationshipsQuery.isError) void relationshipsQuery.refetch();
    if (achievementsQuery.isError) void achievementsQuery.refetch();
    if (studySummary.isError) void studySummary.refetch();
  };

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={handleTabBarScroll}
      scrollEventThrottle={16}
      className="flex-1 bg-canvas"
      contentContainerClassName="px-4 pb-12 pt-2"
      showsVerticalScrollIndicator={false}
      refreshControl={
        authEnabled ? (
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={() => void refreshProfileByPull()}
            tintColor={colors.accent}
          />
        ) : undefined
      }
    >
      <View className="mb-3.5 flex-row items-center justify-between px-1 pt-1">
        <Text accessibilityRole="header" weight="black" className="text-[23px] text-ink">
          Hồ sơ
        </Text>
        {tabRefreshing ? (
          <ActivityIndicator accessibilityLabel="Đang cập nhật hồ sơ" size="small" color={colors.accent} />
        ) : null}
        {authEnabled && user ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={unreadCount > 0 ? `Xem thông báo, ${unreadCount} chưa đọc` : 'Xem thông báo'}
            onPress={openNotifications}
            className="relative h-11 w-11 items-center justify-center rounded-full border border-line bg-surface active:opacity-75"
          >
            <Bell size={18} color={colors.ink} />
            {unreadCount > 0 ? (
              <View className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 items-center justify-center rounded-full bg-danger">
                <Text weight="black" className="text-[8px] text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
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
            <View className="flex-row items-center gap-3.5">
              <View className="relative">
                <View
                  className="h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-accent"
                  style={{ backgroundColor: colors.accentSoft }}
                >
                  <Image
                    source={avatarReference ? { uri: avatarReference } : OWL_AVATAR}
                    accessibilityLabel="Avatar học viên"
                    style={avatarReference ? { width: '100%', height: '100%' } : { width: 44, height: 44 }}
                    contentFit={avatarReference ? 'cover' : 'contain'}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Chỉnh sửa ảnh"
                  hitSlop={12}
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
                <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
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

            <View className="mt-3.5 flex-row items-center divide-x divide-line rounded-2xl border border-line bg-canvas py-2.5">
              <StatCell icon={<Flame size={15} color={colors.flame} />} value={streakDays} label="Ngày streak" />
              <StatCell icon={<Sparkles size={15} color={colors.coin} />} value={totalXp} label="Tổng XP" />
              <StatCell
                icon={<UsersRound size={15} color={colors.social} />}
                value={followersCount}
                label="Người theo dõi"
                accessibilityLabel="Xem hồ sơ cộng đồng và người theo dõi"
                onPress={() => router.push(`/community/users/${user.id}` as never)}
              />
            </View>
          </View>

          {hasSummaryError ? (
            <View className="mb-4 gap-2">
              <Text className="text-xs text-danger">Chưa tải được một phần thông tin hồ sơ.</Text>
              <Button variant="secondary" label="Tải lại thông tin" onPress={retrySummary} />
            </View>
          ) : null}

          <SettingsSection title="HỌC TẬP">
            <SettingsAccordionRow
              icon={Zap}
              title="Mục tiêu học mỗi ngày"
              summary={`${settings.dailyXpGoal} XP / ngày`}
              expanded={expandedSection === 'goal'}
              onToggle={() => toggleSection('goal')}
            >
              <View className="bg-canvas/40 px-4 py-3">
                <Text className="mb-2 text-xs text-muted">Chọn số XP bạn muốn đạt được mỗi ngày:</Text>
                <View className="flex-row gap-2">
                  {XP_PRESETS.map((preset) => {
                    const selected = settings.dailyXpGoal === preset;
                    return (
                      <Pressable
                        key={preset}
                        accessibilityRole="radio"
                        accessibilityLabel={`${preset} XP mỗi ngày`}
                        accessibilityState={{ checked: selected }}
                        onPress={() => void setDailyXpGoal(preset)}
                        className="min-h-11 flex-1 items-center justify-center rounded-xl border py-2 active:opacity-75"
                        style={{
                          backgroundColor: selected ? colors.accentSoft : colors.surface,
                          borderColor: selected ? colors.accent : colors.line,
                        }}
                      >
                        <Text
                          weight="black"
                          className="text-xs"
                          style={{ color: selected ? colors.accentDeep : colors.ink }}
                        >
                          {preset} XP
                        </Text>
                      </Pressable>
                    );
                  })}
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

          <SettingsSection title="CÀI ĐẶT ỨNG DỤNG">
            <SettingsAccordionRow
              icon={Settings2}
              title="Cài đặt & Cấu hình"
              expanded={expandedSection === 'settings'}
              onToggle={() => toggleSection('settings')}
              isLast
            >
              <AppSettingsPanel />
            </SettingsAccordionRow>
          </SettingsSection>

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
                void Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() =>
                  Alert.alert('Không mở được email', `Hãy gửi tới ${SUPPORT_EMAIL}.`),
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

          <Pressable
            onPress={signOutPrompt}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel="Đăng xuất"
            accessibilityState={{ disabled: busy !== null, busy: busy === 'signout' }}
            className="mt-1 min-h-12 flex-row items-center justify-center gap-2 rounded-2xl border active:opacity-75"
            style={{ backgroundColor: colors.dangerSoft, borderColor: colors.danger }}
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

          <Text className="mt-4 text-center text-[11px] text-muted">IELTSPath · Phiên bản {APP_VERSION}</Text>
        </>
      ) : null}
    </ScrollView>
  );
}

function StatCell({
  icon,
  value,
  label,
  accessibilityLabel,
  onPress,
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  accessibilityLabel?: string;
  onPress?: () => void;
}) {
  const body = (
    <>
      <View className="flex-row items-center gap-1">
        {icon}
        <Text weight="black" className="text-base text-ink">
          {value}
        </Text>
      </View>
      <Text className="mt-0.5 text-[10px] font-medium text-muted">{label}</Text>
    </>
  );
  if (!onPress) return <View className="flex-1 items-center">{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      className="flex-1 items-center active:opacity-70"
    >
      {body}
    </Pressable>
  );
}
