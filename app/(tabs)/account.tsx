import Constants from 'expo-constants';
import {
  CircleHelp,
  Palette,
  KeyRound,
  Link2Off,
  LogOut,
  MailCheck,
  MonitorSmartphone,
  Settings2,
  Trash2,
  UserRound,
  UserX,
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
import { googleAvailable, requestFreshGoogleIdToken } from '@/src/features/auth/google';
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
import { useStudyTimezone } from '@/src/features/flashcards/queries';
import { ApiError } from '@/src/lib/api-client';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';
import { useTabBarScrollHandler, useTabReselect } from '@/src/components/navigation/tab-reselect-context';

const APP_VERSION = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';
const SUPPORT_EMAIL = 'theenglishspace01@gmail.com';

type ExpandableSection = 'settings' | null;

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

  const oauthQuery = useQuery({ queryKey: profileQueryKeys.oauth, queryFn: profileApi.getOAuthIdentities, enabled: signedIn });
  const googleIdentity = oauthQuery.data?.find((item) => item.provider.toLowerCase() === 'google');
  const unlink = async () => {
    const provider = googleIdentity?.provider ?? 'google';
    try {
      try {
        await profileApi.unlinkOAuthIdentity(provider);
      } catch (error) {
        // The server may ask for proof first; picking the Google account again gives it.
        if (!(error instanceof ApiError && error.code === 'REAUTH_REQUIRED') || !googleAvailable()) throw error;
        const googleIdToken = await requestFreshGoogleIdToken();
        if (!googleIdToken) return;
        const { reauthToken } = await profileApi.reauthenticate({ googleIdToken });
        await profileApi.unlinkOAuthIdentity(provider, reauthToken);
      }
      await queryClient.invalidateQueries({ queryKey: profileQueryKeys.oauth });
    } catch (error) {
      Alert.alert('Chưa hủy được liên kết', errorMessage(error));
    }
  };
  const unlinkGoogle = () =>
    Alert.alert('Hủy liên kết Google?', 'Bạn sẽ không đăng nhập bằng Google được nữa. Hãy chắc chắn đã có mật khẩu để đăng nhập.', [
      { text: 'Giữ lại', style: 'cancel' },
      { text: 'Hủy liên kết', style: 'destructive', onPress: () => void unlink() },
    ]);

  const relationshipsQuery = useQuery({
    queryKey: ['community', 'relationship', user?.id],
    queryFn: () => communityApi.relationship(user?.id ?? ''),
    enabled: signedIn && Boolean(user?.id),
    staleTime: 60_000,
  });

  const timezone = useStudyTimezone();
  const achievementsQuery = useQuery({
    queryKey: ['vocab', 'achievements', timezone],
    queryFn: () => vocabApi.achievements(timezone),
    enabled: signedIn,
    staleTime: 60_000,
  });

  const unread = useUnread();
  const { settings } = useAppSettings();
  
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
  const followersCount = relationshipsQuery.data?.followerCount ?? (relationshipsQuery.isPending ? '…' : '—');
  const achievementItems = achievementsQuery.data?.items;
  const hasSummaryError =
    learnerQuery.isError || relationshipsQuery.isError || achievementsQuery.isError;
  const retrySummary = () => {
    if (learnerQuery.isError) void learnerQuery.refetch();
    if (relationshipsQuery.isError) void relationshipsQuery.refetch();
    if (achievementsQuery.isError) void achievementsQuery.refetch();
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
            Đồng bộ bài làm và tiến độ học tập của bạn.
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
            <SettingsLinkRow icon={MonitorSmartphone} title="Thiết bị đăng nhập" onPress={() => router.push('/profile/sessions' as never)} />
            {googleIdentity ? <SettingsLinkRow icon={Link2Off} title="Hủy liên kết Google" value="Đã liên kết" onPress={unlinkGoogle} /> : null}
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
            />
            <SettingsLinkRow
              icon={UserX}
              title="Xóa tài khoản"
              danger
              onPress={() => router.push('/profile/delete-account' as never)}
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
