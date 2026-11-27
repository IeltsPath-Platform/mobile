import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Text } from '@/src/components/ui/text';
import { communityApi, type PublicProfile } from '@/src/features/community/api';
import { CommunityAvatar } from '@/src/features/community/components/community-image';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

const PAGE_SIZE = 20;
const BLOCKED_KEY = ['community', 'blocked'] as const;

/** People the learner has blocked, each with a way to unblock. */
export default function BlockedUsersScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const query = useInfiniteQuery({
    queryKey: BLOCKED_KEY,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => communityApi.blocked(pageParam, PAGE_SIZE),
    getNextPageParam: (page) => (page.page + 1 < page.totalPages ? page.page + 1 : undefined),
  });
  const people = useMemo(() => query.data?.pages.flatMap((page) => page.content) ?? [], [query.data]);
  const total = query.data?.pages[0]?.totalElements;

  const unblock = async (person: PublicProfile) => {
    setPendingId(person.id);
    try {
      await communityApi.unblock(person.id);
      haptics.success();
      // Their posts may show again, so every community list is read afresh.
      await qc.invalidateQueries({ queryKey: ['community'] });
    } catch (error) {
      haptics.error();
      Alert.alert('Không thể bỏ chặn', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setPendingId(null);
    }
  };

  let empty: React.ReactElement;
  if (query.isPending) {
    empty = (
      <View className="gap-4 px-4 pt-5">
        {[0, 1, 2].map((row) => (
          <View key={row} className="flex-row items-center gap-3"><Skeleton width={44} height={44} radius={22} /><Skeleton width={160} height={14} /></View>
        ))}
      </View>
    );
  } else if (query.isError) {
    empty = (
      <EmptyState
        framed={false}
        mood="oops"
        title="Ối, chưa tải được danh sách"
        message={query.error instanceof Error ? query.error.message : 'Hãy kiểm tra kết nối rồi thử lại.'}
        action={<Button label="Thử lại" onPress={() => void query.refetch()} />}
      />
    );
  } else {
    empty = (
      <EmptyState
        framed={false}
        title="Bạn chưa chặn ai"
        message="Khi chặn một người từ bài viết hoặc hồ sơ của họ, người đó sẽ hiện ở đây."
        action={<Button variant="secondary" label="Về bảng tin" onPress={() => router.replace('/(tabs)/community' as never)} />}
      />
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <BackHeader title="Người đã chặn" subtitle={total ? `${total} người` : undefined} fallbackHref="/(tabs)/community" />
      <FlatList<PublicProfile>
        data={people}
        keyExtractor={(person) => person.id}
        ListHeaderComponent={people.length ? (
          <Text className="px-4 pb-2 pt-4 text-[13px] leading-5 text-muted">
            Bạn và những người này không thấy bài viết, bình luận và hồ sơ của nhau.
          </Text>
        ) : undefined}
        renderItem={({ item }) => {
          const busy = pendingId === item.id;
          return (
            <View className="min-h-16 flex-row items-center border-b border-line px-4">
              <CommunityAvatar uri={item.avatarUrl} name={item.displayName} size={44} />
              <Text weight="bold" numberOfLines={1} className="ml-3 flex-1">{item.displayName}</Text>
              <Pressable
                disabled={busy}
                onPress={() => void unblock(item)}
                accessibilityRole="button"
                accessibilityLabel={`Bỏ chặn ${item.displayName}`}
                accessibilityState={{ busy }}
                className="min-h-10 min-w-24 items-center justify-center rounded-full border border-line px-4 active:opacity-70">
                {busy ? <ActivityIndicator size="small" color={colors.accent} /> : <Text weight="bold" className="text-sm">Bỏ chặn</Text>}
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={empty}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator className="py-5" color={colors.accent} /> : undefined}
        onEndReached={() => { if (query.hasNextPage && !query.isFetching) void query.fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        contentContainerClassName="pb-10"
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()} tintColor={colors.accent} />}
      />
    </View>
  );
}
