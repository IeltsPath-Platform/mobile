import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, Flame, Target } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { communityApi, type CommunityPost, type CursorPage, type PublicProfile } from '@/src/features/community/api';
import { CommunityAvatar } from '@/src/features/community/components/community-image';
import { usePostMenu } from '@/src/features/community/components/post-menu';
import { PostRow } from '@/src/features/community/components/post-row';
import { setAuthorFollowing } from '@/src/features/community/post-cache';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

type Tab = 'posts' | 'followers' | 'following';
type Entry = CommunityPost | PublicProfile;

const TABS: { key: Tab; label: string }[] = [
  { key: 'posts', label: 'Bài viết' },
  { key: 'followers', label: 'Người theo dõi' },
  { key: 'following', label: 'Đang theo dõi' },
];

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const current = useCurrentUser();
  const [tab, setTab] = useState<Tab>('posts');
  const [followBusy, setFollowBusy] = useState(false);
  const own = current.data?.id === userId;
  const menu = usePostMenu(current.data?.id);

  const profile = useQuery({ queryKey: ['community', 'profile', userId], queryFn: () => communityApi.profile(userId), enabled: Boolean(userId) });
  const relation = useQuery({ queryKey: ['community', 'relationship', userId], queryFn: () => communityApi.relationship(userId), enabled: Boolean(userId) });
  const list = useInfiniteQuery<CursorPage<Entry>>({
    queryKey: ['community', 'profile-list', userId, tab],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => (tab === 'posts'
      ? communityApi.userPosts(userId, pageParam as string | undefined)
      : communityApi[tab](userId, pageParam as string | undefined)),
    getNextPageParam: (page) => (page.hasNext ? page.nextCursor ?? undefined : undefined),
  });
  const entries = useMemo(() => list.data?.pages.flatMap((page) => page.content) ?? [], [list.data]);

  const openPost = useCallback((id: string) => router.push(`/community/${id}` as never), [router]);
  const openProfile = useCallback((id: string) => router.push(`/community/users/${id}` as never), [router]);

  const toggleFollow = async () => {
    if (followBusy || !relation.data) return;
    const was = relation.data.following;
    setFollowBusy(true);
    haptics.tap();
    setAuthorFollowing(qc, userId, !was);
    try {
      await communityApi.follow(userId, was);
    } catch (error) {
      setAuthorFollowing(qc, userId, was);
      haptics.error();
      Alert.alert('Không thể cập nhật theo dõi', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setFollowBusy(false);
    }
  };

  if (profile.isPending) {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Hồ sơ" fallbackHref="/(tabs)/community" />
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.accent} /></View>
      </View>
    );
  }
  if (!profile.data) {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Hồ sơ" fallbackHref="/(tabs)/community" />
        <View className="px-5 pt-8">
          <Text weight="bold">Không tải được hồ sơ.</Text>
          <Text className="mt-1 text-sm text-muted">{profile.error instanceof Error ? profile.error.message : 'Hãy kiểm tra kết nối rồi thử lại.'}</Text>
          <View className="mt-4"><Button label="Thử lại" onPress={() => void profile.refetch()} /></View>
        </View>
      </View>
    );
  }

  const p = profile.data;
  const following = Boolean(relation.data?.following);

  const header = (
    <View className="bg-canvas">
      <View className="h-24 overflow-hidden" style={{ backgroundColor: colors.heroStart }}>
        <View className="absolute -right-6 -top-10 h-40 w-40 rounded-full" style={{ backgroundColor: colors.heroEnd, opacity: 0.55 }} />
        <View className="absolute -left-10 top-10 h-28 w-28 rounded-full" style={{ backgroundColor: colors.heroEnd, opacity: 0.3 }} />
      </View>
      <View className="px-4">
        <View className="-mt-11 flex-row items-end justify-between">
          <View className="rounded-full p-1" style={{ backgroundColor: colors.canvas }}>
            <CommunityAvatar uri={p.avatarUrl} name={p.displayName} size={84} />
          </View>
          {own ? (
            <Pressable onPress={() => router.push('/profile/edit' as never)} accessibilityRole="button" className="mb-1 min-h-11 justify-center rounded-full border border-line px-5 active:opacity-70">
              <Text weight="bold" className="text-sm">Sửa hồ sơ</Text>
            </Pressable>
          ) : (
            <Pressable
              disabled={followBusy || !relation.data}
              onPress={() => void toggleFollow()}
              accessibilityRole="button"
              accessibilityState={{ selected: following, busy: followBusy }}
              className="mb-1 min-h-11 min-w-32 items-center justify-center rounded-full border px-5 active:opacity-80"
              style={{ backgroundColor: following ? 'transparent' : colors.accent, borderColor: following ? colors.line : colors.accent }}>
              <Text weight="bold" className="text-sm" style={{ color: following ? colors.ink : colors.onAccent }}>{following ? 'Đang theo dõi' : 'Theo dõi'}</Text>
            </Pressable>
          )}
        </View>

        <Text accessibilityRole="header" weight="black" className="mt-3 text-2xl" style={{ letterSpacing: -0.4 }}>{p.displayName}</Text>
        {p.bio ? <Text className="mt-1.5 text-[15px] leading-6 text-ink">{p.bio}</Text> : null}

        {p.targetBand != null || p.streak != null ? (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {p.targetBand != null ? (
              <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: colors.listeningSoft }}>
                <Target size={14} color={colors.accent} /><Text weight="semibold" className="text-xs" style={{ color: colors.accent }}>Mục tiêu band {p.targetBand}</Text>
              </View>
            ) : null}
            {p.streak != null ? (
              <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: colors.warmSoft }}>
                <Flame size={14} color={colors.flame} fill={colors.flame} /><Text weight="semibold" className="text-xs" style={{ color: colors.xpDeep }}>{p.streak} ngày liên tục</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View className="mt-4 flex-row gap-6">
          <Pressable onPress={() => setTab('followers')} accessibilityRole="button" className="min-h-11 justify-center">
            <Text className="text-sm text-muted"><Text weight="black" className="text-base text-ink">{relation.data?.followerCount ?? 0}</Text> người theo dõi</Text>
          </Pressable>
          <Pressable onPress={() => setTab('following')} accessibilityRole="button" className="min-h-11 justify-center">
            <Text className="text-sm text-muted"><Text weight="black" className="text-base text-ink">{relation.data?.followingCount ?? 0}</Text> đang theo dõi</Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-1 flex-row border-b border-line px-2">
        {TABS.map(({ key, label }) => {
          const active = tab === key;
          return (
            <Pressable key={key} onPress={() => { if (!active) { haptics.select(); setTab(key); } }} accessibilityRole="tab" accessibilityState={{ selected: active }} className="min-h-12 flex-1 items-center justify-center">
              <Text weight={active ? 'extrabold' : 'semibold'} className="text-[13px]" style={{ color: active ? colors.ink : colors.muted }}>{label}</Text>
              {active ? <View className="absolute bottom-0 h-[3px] w-10 rounded-full" style={{ backgroundColor: colors.accent }} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  let empty: React.ReactElement;
  if (list.isPending) empty = <ActivityIndicator className="py-10" color={colors.accent} />;
  else if (list.isError) empty = <View className="px-4 pt-6"><Text weight="bold">Không tải được danh sách.</Text><View className="mt-3"><Button label="Thử lại" onPress={() => void list.refetch()} /></View></View>;
  else empty = <Text className="px-8 pt-12 text-center text-sm text-muted">{tab === 'posts' ? (own ? 'Bạn chưa đăng bài nào. Chia sẻ điều bạn đang học nhé.' : 'Người này chưa đăng bài nào.') : 'Chưa có ai ở đây.'}</Text>;

  return (
    <View className="flex-1 bg-canvas">
      <BackHeader title={p.displayName} fallbackHref="/(tabs)/community" />
      <FlatList<Entry>
        data={entries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        renderItem={({ item }) => 'body' in item
          ? <PostRow post={item} authorOverride={p} onOpen={openPost} onOpenProfile={openProfile} onMenu={menu.open} />
          : (
            <Pressable accessibilityRole="button" onPress={() => openProfile(item.id)} className="min-h-16 flex-row items-center border-b border-line px-4 active:bg-tint">
              <CommunityAvatar uri={item.avatarUrl} name={item.displayName} size={44} />
              <View className="ml-3 flex-1">
                <Text weight="bold" numberOfLines={1}>{item.displayName}</Text>
                {item.bio ? <Text numberOfLines={1} className="mt-0.5 text-xs text-muted">{item.bio}</Text> : null}
              </View>
              <ChevronRight size={18} color={colors.muted} />
            </Pressable>
          )}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator className="py-4" color={colors.accent} /> : undefined}
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        initialNumToRender={6}
        maxToRenderPerBatch={5}
        windowSize={9}
        contentContainerClassName="pb-10"
        refreshControl={<RefreshControl refreshing={(profile.isRefetching || list.isRefetching) && !list.isFetchingNextPage} onRefresh={() => { void profile.refetch(); void relation.refetch(); void list.refetch(); }} tintColor={colors.accent} />}
      />
      {menu.element}
    </View>
  );
}
