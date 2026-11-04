import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Bell, Bookmark, PenLine, Search, Users, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Text } from '@/src/components/ui/text';
import { useAuth, useCurrentUser } from '@/src/features/auth/auth-provider';
import { communityApi, type CommunityPost, type PostCategory } from '@/src/features/community/api';
import { communityCategoryColor } from '@/src/features/community/community-colors';
import { PostRow } from '@/src/features/community/components/post-row';
import { usePostMenu } from '@/src/features/community/components/post-menu';
import { CATEGORY_LABELS } from '@/src/features/community/format';
import { useUnread } from '@/src/features/community/use-unread';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

type Scope = 'ALL' | 'FOLLOWING';

const SCOPES: { key: Scope; label: string }[] = [
  { key: 'ALL', label: 'Khám phá' },
  { key: 'FOLLOWING', label: 'Đang theo dõi' },
];
const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as PostCategory[];

export default function CommunityScreen() {
  const router = useRouter();
  const { authEnabled, status } = useAuth();
  const user = useCurrentUser();
  const unread = useUnread();
  const signedIn = authEnabled && status === 'authenticated';

  const [scope, setScope] = useState<Scope>('ALL');
  const [category, setCategory] = useState<PostCategory | undefined>();
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
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

  const posts = useMemo(() => {
    const seen = new Set<string>();
    return (feed.data?.pages.flatMap((page) => page.content) ?? []).filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
  }, [feed.data]);

  const menu = usePostMenu(user.data?.id);
  const openPost = useCallback((id: string) => router.push(`/community/${id}` as never), [router]);
  const openProfile = useCallback((id: string) => router.push(`/community/users/${id}` as never), [router]);
  const compose = () => { haptics.tap(); router.push('/community/composer' as never); };

  const closeSearch = () => { setSearching(false); setSearch(''); };
  const unreadCount = unread.data?.count ?? 0;

  const listHeader = (
    <View className="bg-canvas">
      <View className="flex-row border-b border-line px-2">
        {SCOPES.map(({ key, label }) => {
          const active = scope === key;
          return (
            <Pressable
              key={key}
              onPress={() => { if (!active) { haptics.select(); setScope(key); } }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className="min-h-12 flex-1 items-center justify-center">
              <Text weight={active ? 'extrabold' : 'semibold'} className="text-[15px]" style={{ color: active ? colors.ink : colors.muted }}>{label}</Text>
              {active ? <View className="absolute bottom-0 h-[3px] w-12 rounded-full" style={{ backgroundColor: colors.accent }} /> : null}
            </Pressable>
          );
        })}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4 py-3" className="border-b border-line">
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
      <View className="flex-row items-center px-4 pb-1 pt-2">
        <Text accessibilityRole="header" weight="black" className="flex-1 text-[26px]" style={{ letterSpacing: -0.5 }}>Cộng đồng</Text>
        {signedIn ? (
          <>
            <BarButton label="Tìm bài viết" onPress={() => { haptics.tap(); setSearching((open) => !open); }}><Search size={22} color={colors.ink} /></BarButton>
            <BarButton label="Bài viết đã lưu" onPress={() => router.push('/community/bookmarked' as never)}><Bookmark size={22} color={colors.ink} /></BarButton>
            <BarButton label={unreadCount ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'} onPress={() => router.push('/community/notifications' as never)}>
              <Bell size={22} color={colors.ink} />
              {unreadCount > 0 ? (
                <View className="absolute right-1 top-1 min-w-[18px] items-center rounded-full px-1" style={{ backgroundColor: colors.accentWarm }}>
                  <Text weight="bold" className="text-[10px] text-white">{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              ) : null}
            </BarButton>
          </>
        ) : null}
      </View>

      {searching ? (
        <View className="mx-4 mb-2 mt-1 min-h-11 flex-row items-center rounded-full bg-surfaceTint px-4">
          <Search size={17} color={colors.muted} />
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
            <X size={18} color={colors.muted} />
          </Pressable>
        </View>
      ) : null}

      <FlatList<CommunityPost>
        data={signedIn ? posts : []}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => <PostRow post={item} onOpen={openPost} onOpenProfile={openProfile} onMenu={menu.open} />}
        ListHeaderComponent={signedIn ? listHeader : undefined}
        stickyHeaderIndices={signedIn ? [0] : undefined}
        ListEmptyComponent={empty ?? undefined}
        ListFooterComponent={
          feed.isFetchingNextPage
            ? <ActivityIndicator className="py-6" color={colors.accent} />
            : posts.length > 0 && !feed.hasNextPage
              ? <Text className="py-8 text-center text-xs text-muted">Bạn đã xem hết rồi</Text>
              : undefined
        }
        onEndReached={() => { if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage(); }}
        onEndReachedThreshold={0.6}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={9}
        style={{ opacity: feed.isPlaceholderData ? 0.55 : 1 }}
        contentContainerClassName="pb-28"
        refreshControl={<RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage && !feed.isPlaceholderData} onRefresh={() => void feed.refetch()} tintColor={colors.accent} />}
      />

      {signedIn ? (
        <Pressable
          onPress={compose}
          accessibilityRole="button"
          accessibilityLabel="Viết bài mới"
          className="absolute bottom-5 right-4 h-14 flex-row items-center gap-2 rounded-full px-5 active:opacity-80"
          style={{ backgroundColor: colors.accent, shadowColor: colors.shadow, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
          <PenLine size={20} color={colors.onAccent} />
          <Text weight="extrabold" className="text-[15px]" style={{ color: colors.onAccent }}>Viết bài</Text>
        </Pressable>
      ) : null}

      {menu.element}
    </View>
  );
}

function BarButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={2} className="h-11 w-11 items-center justify-center rounded-full active:bg-tint">
      {children}
    </Pressable>
  );
}

function Chip({ label, active, onPress, accent = colors.accentDeep, tint = colors.accentSoft }: { label: string; active: boolean; onPress: () => void; accent?: string; tint?: string }) {
  return (
    <Pressable
      onPress={() => { if (!active) haptics.select(); onPress(); }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className="min-h-9 justify-center rounded-full border px-3.5 active:opacity-70"
      style={{ backgroundColor: active ? tint : 'transparent', borderColor: active ? accent : colors.line }}>
      <Text weight="bold" className="text-[13px]" style={{ color: active ? accent : colors.muted }}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <View className="items-center px-8 pt-16">
      <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: colors.accentSoft }}>{icon}</View>
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
        <View key={row} className="border-b border-line px-4 py-4">
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
