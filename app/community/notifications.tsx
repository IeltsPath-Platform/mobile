import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { CheckCheck, ChevronLeft, Settings, Sparkles } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { communityApi, notificationHasNext, type Notification } from '@/src/features/community/api';
import { CommunityAvatar } from '@/src/features/community/components/community-image';
import { colors } from '@/src/theme';

export const eventLabels: Record<string, string> = {
  'community.post-commented.v1': 'đã bình luận về bài viết của bạn',
  'community.comment-replied.v1': 'đã trả lời bình luận của bạn',
  'community.comment-mentioned.v1': 'đã nhắc đến bạn trong bình luận',
  'community.post-reacted.v1': 'đã bày tỏ cảm xúc về bài viết của bạn',
  'community.user-followed.v1': 'đã bắt đầu theo dõi bạn',
};

export function eventLabel(type: string) {
  return eventLabels[type] ?? 'đã tương tác với bạn trong cộng đồng';
}

const NotificationRow = memo(function NotificationRow({ item, onOpen }: { item: Notification; onOpen: (item: Notification) => void }) {
  const actorQuery = useQuery({
    queryKey: ['community', 'profile', item.actorId],
    queryFn: () => communityApi.profile(item.actorId),
    enabled: !item.actor && Boolean(item.actorId),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const actor = item.actor ?? actorQuery.data;
  const unread = !item.readAt;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${actor?.displayName ?? 'Thành viên'} ${eventLabel(item.eventType)}`}
      onPress={() => onOpen(item)}
      className={`mb-3 min-h-[76px] flex-row items-center rounded-2xl border px-4 py-3 ${unread ? '' : 'border-line bg-surface'}`}
      style={unread ? { backgroundColor: colors.accentSoft, borderColor: colors.accent } : undefined}>
      <CommunityAvatar uri={actor?.avatarUrl} name={actor?.displayName} size={42} />
      <View className="ml-3 flex-1">
        <Text className="text-sm leading-5">
          <Text weight={unread ? 'bold' : 'regular'}>{actor?.displayName ?? 'Thành viên'}</Text>
          <Text className="text-muted"> {eventLabel(item.eventType)}.</Text>
        </Text>
        <Text className="mt-1 text-xs text-muted">{new Date(item.createdAt).toLocaleString('vi-VN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
      {unread ? <View className="ml-3 h-2.5 w-2.5 rounded-full bg-accent" /> : null}
    </Pressable>
  );
});

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const list = useInfiniteQuery({
    queryKey: ['community', 'notifications'] as const,
    queryFn: ({ pageParam }) => communityApi.notifications(Number(pageParam), 20),
    initialPageParam: 0 as number,
    getNextPageParam: (last, pages) => notificationHasNext(last, 20) ? pages.length : undefined,
  });
  const unread = useQuery({ queryKey: ['community', 'unread'], queryFn: communityApi.unread });
  const notifications = list.data?.pages.flat() ?? [];

  const refresh = useCallback(async () => {
    await Promise.all([list.refetch(), unread.refetch()]);
  }, [list.refetch, unread.refetch]);

  const markAll = useCallback(async () => {
    try {
      await communityApi.markAll();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['community', 'notifications'] }),
        queryClient.invalidateQueries({ queryKey: ['community', 'unread'] }),
      ]);
    } catch (error) {
      Alert.alert('Chưa thể cập nhật', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    }
  }, [queryClient]);

  const openNotification = useCallback(async (item: Notification) => {
    try {
      if (!item.readAt) {
        await communityApi.markRead(item.id);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['community', 'unread'] }),
          queryClient.invalidateQueries({ queryKey: ['community', 'notifications'] }),
        ]);
      }
      if (item.eventType === 'community.user-followed.v1') router.push(`/community/users/${item.actorId}` as never);
      else if (item.postId) router.push({ pathname: '/community/[postId]', params: { postId: item.postId, commentId: item.commentId ?? '' } } as never);
      else Alert.alert('Nội dung không còn khả dụng', 'Thông báo đã được đánh dấu là đã đọc.');
    } catch (error) {
      Alert.alert('Chưa thể mở thông báo', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    }
  }, [queryClient, router]);

  const header = (
    <View className="border-b border-line bg-surface px-4 pb-4 pt-3">
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full bg-canvas" accessibilityLabel="Quay lại"><ChevronLeft size={21} color={colors.ink} /></Pressable>
        <Text weight="black" className="text-lg">Thông báo</Text>
        <Pressable onPress={() => router.push('/community/notification-preferences' as never)} className="h-11 w-11 items-center justify-center rounded-full bg-canvas" accessibilityLabel="Tuỳ chọn thông báo"><Settings size={19} color={colors.ink} /></Pressable>
      </View>
      <View className="mt-4 flex-row items-center justify-between">
        <View><Text weight="bold" className="text-2xl">Hoạt động</Text><Text className="mt-1 text-sm text-muted">{unread.data?.count ?? 0} thông báo chưa đọc</Text></View>
        <Pressable disabled={!unread.data?.count} onPress={() => void markAll()} className="min-h-11 flex-row items-center gap-2 rounded-full px-4" style={{ backgroundColor: colors.accentSoft }}><CheckCheck size={16} color={colors.accent} /><Text weight="semibold" className="text-xs text-accent">Đọc tất cả</Text></Pressable>
      </View>
    </View>
  );

  const empty = list.isPending ? (
    <View className="items-center py-16"><ActivityIndicator color={colors.accent} /><Text className="mt-3 text-sm text-muted">Đang tải hoạt động…</Text></View>
  ) : list.isError ? (
    <Pressable onPress={() => void refresh()} className="items-center rounded-3xl border border-line bg-surface p-6"><Text weight="bold">Không tải được thông báo</Text><Text className="mt-2 text-sm text-accent">Chạm để thử lại</Text></Pressable>
  ) : (
    <View className="items-center rounded-3xl border border-line bg-surface px-7 py-10">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-accent-soft"><Sparkles size={28} color={colors.accent} /></View>
      <Text weight="bold" className="mt-4 text-lg">Bạn đã cập nhật hết rồi</Text>
      <Text className="mt-2 text-center text-sm leading-5 text-muted">Khi có người tương tác với bạn, thông báo sẽ xuất hiện ở đây.</Text>
    </View>
  );

  return (
    <FlatList
      className="flex-1 bg-canvas"
      contentContainerClassName="grow px-4 pb-10 pt-4"
      data={notifications}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <NotificationRow item={item} onOpen={openNotification} />}
      ListHeaderComponent={header}
      ListEmptyComponent={empty ?? undefined}
      ListFooterComponent={notifications.length > 0 ? <>
        {list.isFetchingNextPage ? <ActivityIndicator className="py-4" color={colors.accent} /> : null}
        {list.isFetchNextPageError ? <Pressable onPress={() => void list.fetchNextPage()} className="min-h-11 items-center justify-center"><Text weight="bold" className="text-accent">Thử tải lại</Text></Pressable> : null}
      </> : undefined}
      onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
      onEndReachedThreshold={0.5}
      initialNumToRender={10}
      maxToRenderPerBatch={8}
      windowSize={7}
      refreshControl={<RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={() => void refresh()} tintColor={colors.accent} />}
    />
  );
}
