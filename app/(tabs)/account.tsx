import Constants from 'expo-constants';
import {
  BookOpen,
  CircleHelp,
  Palette,
  KeyRound,
  LogOut,
  MailCheck,
  Settings2,
  Trash2,
  Trophy,
  UserRound,
  Zap,
} from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
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
import { ProfileHero } from '@/src/features/profile/components/profile-hero';
import { ProfileRewardsCard } from '@/src/features/profile/components/profile-rewards-card';
import { THEME_LABEL, openThemeSheet } from '@/src/features/settings/components/theme-sheet';
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
    queryFn: () => communityApi.relationship(user?.id ?? ''),
    enabled: signedIn && Boolean(user?.id),
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
    if (!signedIn) return;
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
        // Keep the signed-in user (['auth', 'me']); drop every other cached query.
        queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
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
      contentContainerClassName="px-4 pb-28 pt-3"
      showsVerticalScrollIndicator={false}
      refreshControl={
        signedIn ? (
          <RefreshControl
            refreshing={pullRefreshing || tabRefreshing}
            onRefresh={() => void refreshProfileByPull()}
            tintColor={colors.accent}
          />
        ) : undefined
      }
    >
      <Text accessibilityRole="header" weight="black" className="mb-3 px-1 text-[28px] text-ink">
        Hồ sơ
      </Text>

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
          <ProfileHero
            name={displayName}
            email={user.email}
            band={band}
            createdAt={user.createdAt}
            avatarUrl={avatarReference}
            streak={streakDays}
            xp={totalXp}
            followers={followersCount}
            onEdit={() => router.push('/profile/edit' as never)}
            onOpenCommunity={() => router.push(`/community/users/${user.id}` as never)}
          />
          <Button
            className="mt-4"
            variant="secondary"
            label="Sửa hồ sơ"
            onPress={() => router.push('/profile/edit' as never)}
          />

          {user.emailVerified === false ? (
            <Card className="mt-4 gap-3 p-4">
              <Text className="text-sm leading-5 text-muted">
                Email của bạn chưa được xác minh. Hãy xác minh để mua gói và đổi mật khẩu.
              </Text>
              <Button variant="secondary" label="Xác minh email" onPress={() => router.push('/profile/verify-email' as never)} />
            </Card>
          ) : null}

          {hasSummaryError ? (
            <View className="mb-4 gap-2">
              <Text className="text-xs text-danger">Chưa tải được một phần thông tin hồ sơ.</Text>
              <Button variant="secondary" label="Tải lại thông tin" onPress={retrySummary} />
            </View>
          ) : null}

          <ProfileRewardsCard
            items={achievementItems}
            loading={achievementsQuery.isPending}
            onOpenAll={() => router.push('/achievements' as never)}
          />

          <View className="h-5" />
          <SettingsSection title="Học tập">
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

          <SettingsSection title="Nội dung khác">
            <SettingsLinkRow
              icon={Palette}
              title="Giao diện"
              value={THEME_LABEL[settings.theme]}
              onPress={openThemeSheet}
            />
            <SettingsAccordionRow
              icon={Settings2}
              title="Âm thanh, thông báo & cỡ chữ"
              expanded={expandedSection === 'settings'}
              onToggle={() => toggleSection('settings')}
              isLast
            >
              <AppSettingsPanel />
            </SettingsAccordionRow>
          </SettingsSection>

          <SettingsSection title="Tài khoản">
            <SettingsLinkRow
              icon={KeyRound}
              title={user?.hasPassword === false ? 'Tạo mật khẩu' : 'Đổi mật khẩu'}
              onPress={() => router.push('/profile/change-password' as never)}
            />
            {user?.emailVerified === false ? (
              <SettingsLinkRow
                icon={MailCheck}
                title="Xác minh email"
                badgeText="Chưa xác minh"
                onPress={() => router.push('/profile/verify-email' as never)}
              />
            ) : null}
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
            className="min-h-12 flex-row items-center justify-center gap-2 active:opacity-70"
          >
            {busy === 'signout' ? <ActivityIndicator color={colors.danger} size="small" /> : <LogOut size={18} color={colors.danger} />}
            <Text weight="black" className="text-base" style={{ color: colors.danger }}>
              Đăng xuất
            </Text>
          </Pressable>

          <View className="my-5 items-center">
            <View style={{ width: 120, height: 4, borderRadius: 2, backgroundColor: colors.line }} />
          </View>
          <Text className="mt-4 text-center text-[11px] text-muted">IELTSPath · Phiên bản {APP_VERSION}</Text>
        </>
      ) : null}
    </ScrollView>
  );
}
