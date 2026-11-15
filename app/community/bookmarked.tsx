import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Text } from '@/src/components/ui/text';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { dedupePosts } from '@/src/features/community/format';
import { communityApi, type CommunityPost } from '@/src/features/community/api';
import { usePostMenu } from '@/src/features/community/components/post-menu';
import { PostRow } from '@/src/features/community/components/post-row';
import { colors } from '@/src/theme';

export default function BookmarkedScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const menu = usePostMenu(user.data?.id);
  const query = useInfiniteQuery({
    queryKey: ['community', 'bookmarks'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => communityApi.bookmarks(pageParam),
    getNextPageParam: (page) => (page.hasNext ? page.nextCursor ?? undefined : undefined),
  });

  const posts = useMemo(() => dedupePosts(query.data?.pages), [query.data]);

  const openPost = useCallback((id: string) => router.push(`/community/${id}` as never), [router]);
  const openProfile = useCallback((id: string) => router.push(`/community/users/${id}` as never), [router]);

  let empty: React.ReactElement;
  if (query.isPending) {
    empty = (
      <View className="gap-5 px-4 pt-5">
        {[0, 1, 2].map((row) => (
          <View key={row} className="gap-2"><Skeleton width={160} height={14} /><Skeleton height={12} /><Skeleton height={12} width="70%" /></View>
        ))}
      </View>
    );
  } else if (query.isError) {
    empty = (
      <EmptyState
        framed={false}
        mood="oops"
        title="Ối, chưa tải được bài đã lưu"
        message={query.error instanceof Error ? query.error.message : 'Hãy kiểm tra kết nối rồi thử lại.'}
        action={<Button label="Thử lại" onPress={() => void query.refetch()} />}
      />
    );
  } else {
    empty = (
      <EmptyState
        framed={false}
        title="Chưa lưu bài nào"
        message="Chạm biểu tượng dấu trang dưới mỗi bài để giữ lại đọc sau."
        action={<Button variant="secondary" label="Về bảng tin" onPress={() => router.replace('/(tabs)/community' as never)} />}
      />
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <BackHeader title="Đã lưu" subtitle={posts.length ? `${posts.length}${query.hasNextPage ? '+' : ''} bài viết` : undefined} fallbackHref="/(tabs)/community" />
      <FlatList<CommunityPost>
        data={posts}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => <PostRow post={item} onOpen={openPost} onOpenProfile={openProfile} onMenu={menu.open} />}
        ListEmptyComponent={empty}
        ListFooterComponent={
          query.isFetchNextPageError
            ? <View className="items-center gap-2 px-4 py-5"><Text className="text-sm text-muted">Không tải được các bài tiếp theo.</Text><Button variant="secondary" label="Thử lại" onPress={() => void query.fetchNextPage()} /></View>
            : query.isFetchingNextPage
              ? <ActivityIndicator className="py-5" color={colors.accent} />
              : undefined
        }
        onEndReached={() => { if (query.hasNextPage && !query.isFetching && !query.isFetchNextPageError) void query.fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        removeClippedSubviews
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={9}
        contentContainerClassName="pb-10"
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()} tintColor={colors.accent} />}
      />
      {menu.element}
    </View>
  );
}
