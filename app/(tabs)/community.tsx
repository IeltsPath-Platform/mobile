import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image as CachedImage } from 'expo-image';
import { PenLine, Search, Users, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, TextInput, View, type FlatList as NativeFlatList, type LayoutChangeEvent, type ListViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { interpolate, runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Text } from '@/src/components/ui/text';
import { useAuth, useCurrentUser } from '@/src/features/auth/auth-provider';
import { communityApi, type CommunityPost, type PostCategory } from '@/src/features/community/api';
import { communityCategoryColor } from '@/src/features/community/community-colors';
import { PostRow } from '@/src/features/community/components/post-row';
import { CommunityAvatar } from '@/src/features/community/components/community-image';
import { usePostMenu } from '@/src/features/community/components/post-menu';
import { CATEGORY_LABELS, dedupePosts } from '@/src/features/community/format';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';
import { useTabBarOffsetHandler, useTabReselect } from '@/src/components/navigation/tab-reselect-context';

type Scope = 'ALL' | 'FOLLOWING';

const SCOPES: { key: Scope; label: string }[] = [
  { key: 'ALL', label: 'Khám phá' },
  { key: 'FOLLOWING', label: 'Đang theo dõi' },
];
const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as PostCategory[];
const FEED_VIEWABILITY = { itemVisiblePercentThreshold: 35 };

export default function CommunityScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const listRef = useRef<NativeFlatList<CommunityPost>>(null);
  const handleTabBarOffset = useTabBarOffsetHandler();
  const insets = useSafeAreaInsets();
  const refreshPrimed = useRef(false);
  const { authEnabled, status } = useAuth();
  const user = useCurrentUser();
  const signedIn = authEnabled && status === 'authenticated';
  const ownProfile = useQuery({ queryKey: ['community', 'profile', user.data?.id], queryFn: () => communityApi.profile(user.data!.id), enabled: signedIn && Boolean(user.data?.id), staleTime: 5 * 60_000 });

  const [scope, setScope] = useState<Scope>('ALL');
  const [category, setCategory] = useState<PostCategory | undefined>();
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const manualRefreshInFlight = useRef(false);
  const initialHeaderHeight = insets.top + 56 + (signedIn ? 112 : 0) + (searching ? 56 : 0);
  const [headerHeight, setHeaderHeight] = useState(initialHeaderHeight);
  const headerHeightShared = useSharedValue(initialHeaderHeight);
  const headerReveal = useSharedValue(initialHeaderHeight);
  const previousScrollOffset = useSharedValue(0);
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerHeightShared.value > 0 ? interpolate(headerReveal.value, [0, headerHeightShared.value], [0, 1]) : 1,
    transform: [{ translateY: headerReveal.value - headerHeightShared.value }],
  }));

  const onHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight <= 0) return;
    setHeaderHeight((current) => current === nextHeight ? current : nextHeight);
    const wasVisible = headerReveal.value >= headerHeightShared.value - 1;
    headerHeightShared.value = nextHeight;
    headerReveal.value = wasVisible ? nextHeight : Math.min(headerReveal.value, nextHeight);
  }, [headerHeightShared, headerReveal]);

  const onFeedScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const offset = Math.max(0, event.contentOffset.y);
      const delta = offset - previousScrollOffset.value;
      previousScrollOffset.value = offset;
      if (searching || offset <= 0) {
        headerReveal.value = headerHeightShared.value;
      } else if (Math.abs(delta) > 0.2) {
        headerReveal.value = Math.max(0, Math.min(headerHeightShared.value, headerReveal.value - delta));
      }
      runOnJS(handleTabBarOffset)(offset);
    },
  }, [handleTabBarOffset, searching]);
  useEffect(() => {
    const id = setTimeout(() => setQuery(search.trim().slice(0, 120)), 350);
    return () => clearTimeout(id);
  }, [search]);

  const feed = useInfiniteQuery({
    queryKey: ['community', 'feed', scope, category, query],
    enabled: signedIn,
    staleTime: 45_000,
    placeholderData: keepPreviousData,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => communityApi.feed(pageParam, scope, category, query),
    getNextPageParam: (last) => (last.hasNext ? last.nextCursor ?? undefined : undefined),
  });

  const refreshFeedFromTop = useCallback(() => {
    if (!refreshPrimed.current) {
      refreshPrimed.current = true;
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      return;
    }

    refreshPrimed.current = false;
    if (feed.isFetching || manualRefreshInFlight.current) return;
    const key = ['community', 'feed', scope, category, query] as const;
    manualRefreshInFlight.current = true;
    setManualRefreshing(true);
    void communityApi.feed(undefined, scope, category, query)
      .then((firstPage) => {
        queryClient.setQueryData(key, (current: typeof feed.data) => current
          ? { ...current, pages: [firstPage], pageParams: [undefined] }
          : { pages: [firstPage], pageParams: [undefined] });
      })
      .catch((error: unknown) => {
        Alert.alert('Chưa thể làm mới bảng tin', error instanceof Error ? error.message : 'Vui lòng thử lại.');
      })
      .finally(() => {
        manualRefreshInFlight.current = false;
        setManualRefreshing(false);
      });
  }, [category, feed.isFetching, query, queryClient, scope]);

  useTabReselect('community', refreshFeedFromTop);

  // Tabs stay mounted while navigating elsewhere. Refresh stale pages on return
  // without clearing the cached feed or moving the user's scroll position.
  useFocusEffect(
    useCallback(() => {
      refreshPrimed.current = false;
      headerReveal.value = headerHeightShared.value;
      if (!signedIn) return;
      // Refresh only the first page of stale active feeds; refetchQueries would re-request every loaded page.
      for (const cached of queryClient.getQueryCache().findAll({ queryKey: ['community', 'feed'], type: 'active', stale: true })) {
        if (cached.state.fetchStatus === 'fetching' || !cached.state.data) continue;
        const [, , feedScope, feedCategory, feedQuery] = cached.queryKey as readonly [string, string, Scope, PostCategory | undefined, string];
        void communityApi.feed(undefined, feedScope, feedCategory, feedQuery)
          .then((firstPage) => {
            queryClient.setQueryData(cached.queryKey, (current: typeof feed.data) => current
              ? { ...current, pages: [firstPage, ...current.pages.slice(1)] }
              : current);
          })
          .catch(() => { /* background refresh; the cached feed stays visible and pull-to-refresh reports errors */ });
      }
      if (user.data?.id) {
        void queryClient.refetchQueries({
          queryKey: ['community', 'profile', user.data.id],
          type: 'active',
          stale: true,
        });
      }
      return () => { refreshPrimed.current = false; };
    }, [headerHeightShared, headerReveal, previousScrollOffset, queryClient, signedIn, user.data?.id]),
  );

  const posts = useMemo(() => dedupePosts(feed.data?.pages), [feed.data]);

  // Keep only a few upcoming post images warm in the disk/memory cache. FlatList
  // still mounts rows on demand, while the image request starts just before they appear.
  const postsRef = useRef(posts);
  postsRef.current = posts;
  const prefetchedImages = useRef(new Set<string>());
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const visibleIndexes = viewableItems
      .map((token) => token.index)
      .filter((index): index is number => index != null);
    if (!visibleIndexes.length) return;
    const lastVisible = Math.max(...visibleIndexes);
    const urls = postsRef.current
      .slice(lastVisible + 1, lastVisible + 5)
      .flatMap((post) => [post.author?.avatarUrl, ...post.imageUrls])
      .filter((url): url is string => url != null && url.length > 0 && !prefetchedImages.current.has(url));
    if (!urls.length) return;
    urls.forEach((url) => {
      prefetchedImages.current.add(url);
      if (prefetchedImages.current.size > 200) {
        const oldest = prefetchedImages.current.values().next().value;
        if (oldest) prefetchedImages.current.delete(oldest);
      }
    });
    void CachedImage.prefetch(urls, 'disk').then((ok) => {
      if (!ok) urls.forEach((url) => prefetchedImages.current.delete(url));
    }).catch(() => urls.forEach((url) => prefetchedImages.current.delete(url)));
  }).current;

  const menu = usePostMenu(user.data?.id);
  const openPost = useCallback((id: string) => router.push(`/community/${id}` as never), [router]);
  const openProfile = useCallback((id: string) => router.push(`/community/users/${id}` as never), [router]);
  const openOwnProfile = () => { if (user.data?.id) { haptics.tap(); openProfile(user.data.id); } };
  const compose = () => { haptics.tap(); router.push('/community/composer' as never); };

  const closeSearch = () => { setSearching(false); setSearch(''); };
  const listHeader = (
    <View className="bg-canvas">
      <View className="flex-row gap-2 px-4 pb-1 pt-2">
        {SCOPES.map(({ key, label }) => {
          const active = scope === key;
          return (
            <Pressable
              key={key}
              onPress={() => { if (!active) { haptics.select(); setScope(key); } }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className="min-h-12 flex-1 items-center justify-center rounded-2xl active:opacity-80"
              style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: active ? colors.accent : colors.line, borderBottomColor: active ? colors.accentShade : colors.edge, backgroundColor: active ? colors.accentSoft : colors.surface }}>
              <Text weight="extrabold" className="text-[15px]" style={{ color: active ? colors.accentDeep : colors.muted }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4 py-3">
        <Chip label="Tất cả" active={!category} onPress={() => setCategory(undefined)} />
        {CATEGORY_ORDER.map((key) => {
          const palette = communityCategoryColor(key);
          return <Chip key={key} label={CATEGORY_LABELS[key]} active={category === key} accent={palette.foreground} tint={palette.background} onPress={() => setCategory(category === key ? undefined : key)} />;
        })}
      </ScrollView>
    </View>
  );

  let empty: React.ReactElement | null = null;
  if (!signedIn) {
    empty = status === 'loading'
      ? <FeedSkeleton />
      : (
        <EmptyState
          icon={<Users size={30} color={colors.accent} />}
          title="Học cùng người khác sẽ vui hơn"
          body="Đăng nhập để hỏi đáp, chia sẻ bài Writing và tìm bạn luyện Speaking."
          action={<Button label="Đăng nhập" onPress={() => router.push('/(auth)/login' as never)} />}
        />
      );
  } else if (feed.isPending) {
    empty = <FeedSkeleton />;
  } else if (feed.isError) {
    empty = (
      <View className="px-4 pt-6">
        <FormAlert tone="error" message={feed.error instanceof Error ? feed.error.message : 'Không tải được bảng tin.'} />
        <View className="mt-3"><Button label="Thử lại" onPress={() => void feed.refetch()} /></View>
      </View>
    );
  } else if (query) {
    empty = <EmptyState icon={<Search size={28} color={colors.accent} />} title="Không thấy kết quả" body={`Chưa có bài nào khớp với “${query}”. Thử từ khóa ngắn hơn nhé.`} />;
  } else if (scope === 'FOLLOWING') {
    empty = (
      <EmptyState
        icon={<Users size={30} color={colors.accent} />}
        title="Chưa có bài từ người bạn theo dõi"
        body="Theo dõi vài người học giỏi để bài của họ hiện ở đây."
        action={<Button variant="secondary" label="Khám phá bài viết" onPress={() => setScope('ALL')} />}
      />
    );
  } else {
    empty = (
      <EmptyState
        icon={<PenLine size={28} color={colors.accent} />}
        title="Chưa có bài viết nào"
        body="Hãy là người đầu tiên chia sẻ điều bạn đang học."
        action={<Button label="Viết bài đầu tiên" onPress={compose} />}
      />
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <Animated.View
        pointerEvents="box-none"
        style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, elevation: 10, backgroundColor: colors.canvas }, headerAnimatedStyle]}>
        <View onLayout={onHeaderLayout} style={{ paddingTop: insets.top, backgroundColor: colors.canvas }}>
          <View className="flex-row items-center gap-2 px-4 pb-1 pt-1">
            {searching ? (
              <View className="min-h-12 flex-1 flex-row items-center rounded-2xl px-4" style={{ borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.surface }}>
                <Search size={18} color={colors.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                  placeholder="Tìm bài viết hoặc chủ đề"
                  placeholderTextColor={colors.muted}
                  returnKeyType="search"
                  className="min-h-11 flex-1 px-2 text-base text-ink"
                  accessibilityLabel="Tìm bài viết hoặc chủ đề"
                />
                <Pressable onPress={closeSearch} hitSlop={10} accessibilityRole="button" accessibilityLabel="Đóng tìm kiếm" className="h-8 w-8 items-center justify-center">
                  <X size={20} color={colors.muted} />
                </Pressable>
              </View>
            ) : (
              <>
                <Text accessibilityRole="header" weight="black" className="flex-1 text-[28px]">Cộng đồng</Text>
                {(manualRefreshing || (feed.isRefetching && !feed.isFetchingNextPage)) ? <ActivityIndicator size="small" color={colors.accent} /> : null}
                {signedIn ? (
                  <>
                    <Pressable onPress={() => { haptics.tap(); setSearching(true); headerReveal.value = headerHeightShared.value; }} accessibilityRole="button" accessibilityLabel="Tìm bài viết" className="h-12 w-12 items-center justify-center rounded-full active:opacity-70">
                      <Search size={22} color={colors.ink} />
                    </Pressable>
                    <Pressable onPress={openOwnProfile} disabled={!user.data?.id} accessibilityRole="button" accessibilityLabel="Hồ sơ cộng đồng của tôi" className="h-12 w-12 items-center justify-center rounded-full active:opacity-80">
                      <CommunityAvatar uri={ownProfile.data?.avatarUrl} name={ownProfile.data?.displayName ?? user.data?.fullName} size={40} />
                    </Pressable>
                  </>
                ) : null}
              </>
            )}
          </View>
          {signedIn ? listHeader : null}
        </View>
      </Animated.View>

      <Animated.FlatList<CommunityPost>
        ref={listRef}
        onScroll={onFeedScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        data={signedIn ? posts : []}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => <PostRow post={item} onOpen={openPost} onOpenProfile={openProfile} onMenu={menu.open} />}
        ListEmptyComponent={empty ?? undefined}
        ListFooterComponent={
          feed.isFetchNextPageError
            ? <View className="items-center gap-2 px-4 py-5"><Text className="text-sm text-muted">Không tải được các bài tiếp theo.</Text><Button variant="secondary" label="Thử lại" onPress={() => void feed.fetchNextPage()} /></View>
            : feed.isFetchingNextPage
            ? <ActivityIndicator className="py-6" color={colors.accent} />
            : posts.length > 0 && !feed.hasNextPage
              ? <Text className="py-8 text-center text-xs text-muted">Bạn đã xem hết rồi</Text>
              : undefined
        }
        onEndReached={() => { if (feed.hasNextPage && !feed.isFetching && !feed.isFetchNextPageError) void feed.fetchNextPage(); }}
        onEndReachedThreshold={0.6}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={FEED_VIEWABILITY}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={9}
        style={{ opacity: feed.isPlaceholderData ? 0.55 : 1 }}
        contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: Math.max(insets.bottom, 10) + 100 }}
        refreshControl={<RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage && !feed.isPlaceholderData} onRefresh={() => void feed.refetch()} tintColor={colors.accent} />}
      />

      {signedIn ? (
        <Pressable
          onPress={compose}
          accessibilityRole="button"
          accessibilityLabel="Viết bài mới"
          className="absolute right-4 h-14 flex-row items-center gap-2 rounded-2xl px-5 active:opacity-80"
          style={{ bottom: Math.max(insets.bottom, 10) + 84, backgroundColor: colors.accent, borderBottomWidth: 4, borderBottomColor: colors.accentShade }}>
          <PenLine size={20} color={colors.onAccent} strokeWidth={2.8} />
          <Text weight="extrabold" className="text-[15px] uppercase" style={{ color: colors.onAccent, letterSpacing: 0.6 }}>Viết bài</Text>
        </Pressable>
      ) : null}

      {menu.element}
    </View>
  );
}

function Chip({ label, active, onPress, accent = colors.accentDeep, tint = colors.accentSoft }: { label: string; active: boolean; onPress: () => void; accent?: string; tint?: string }) {
  return (
    <Pressable
      onPress={() => { if (!active) haptics.select(); onPress(); }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 4, bottom: 4 }}
      className="min-h-10 justify-center rounded-2xl px-4 active:opacity-70"
      style={{ borderWidth: 2, borderBottomWidth: 3, backgroundColor: active ? tint : colors.surface, borderColor: active ? accent : colors.line, borderBottomColor: active ? accent : colors.edge }}>
      <Text weight="extrabold" className="text-[13px]" style={{ color: active ? accent : colors.muted }}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({ title, body, action }: { icon?: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <View className="items-center px-8 pt-10">
      <CachedImage source={require('@/assets/images/owl/nav-owl-stand.webp')} contentFit="contain" style={{ width: 120, height: 120 }} accessibilityIgnoresInvertColors />
      <Text weight="extrabold" className="mt-4 text-center text-lg">{title}</Text>
      <Text className="mt-2 text-center text-sm leading-5 text-muted">{body}</Text>
      {action ? <View className="mt-5 self-stretch">{action}</View> : null}
    </View>
  );
}

function FeedSkeleton() {
  return (
    <View accessibilityLabel="Đang tải bảng tin" accessibilityRole="progressbar">
      {[0, 1, 2].map((row) => (
        <View key={row} className="mx-3 mb-3 rounded-3xl px-4 py-4" style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderBottomColor: colors.edge, backgroundColor: colors.surface }}>
          <View className="flex-row items-center">
            <Skeleton width={42} height={42} radius={21} />
            <View className="ml-3 gap-2"><Skeleton width={140} height={13} /><Skeleton width={90} height={10} /></View>
          </View>
          <View className="mt-4 gap-2"><Skeleton height={12} /><Skeleton height={12} width="92%" /><Skeleton height={12} width="64%" /></View>
          {row === 0 ? <Skeleton height={200} radius={16} style={{ marginTop: 14 }} /> : null}
        </View>
      ))}
    </View>
  );
}
