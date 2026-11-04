import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { AtSign, BellOff, CheckCheck, CornerDownRight, Heart, MessageCircle, Settings, UserPlus, type LucideIcon } from 'lucide-react-native';
import { memo, useCallback, useMemo } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, SectionList, View } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Text } from '@/src/components/ui/text';
import { communityApi, notificationHasNext, type Notification } from '@/src/features/community/api';
import { CommunityAvatar } from '@/src/features/community/components/community-image';
import { timeAgo } from '@/src/features/community/format';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

const notificationsKey = ['community', 'notifications'] as const;
const unreadKey = ['community', 'unread'] as const;

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

/** Icon + tint for the small badge on each avatar, so the event type reads before the text does. */
function eventBadge(type: string): { Icon: LucideIcon; color: string } {
  switch (type) {
    case 'community.post-commented.v1': return { Icon: MessageCircle, color: colors.accent };
    case 'community.comment-replied.v1': return { Icon: CornerDownRight, color: colors.accent };
    case 'community.comment-mentioned.v1': return { Icon: AtSign, color: colors.warning };
    case 'community.post-reacted.v1': return { Icon: Heart, color: colors.reaction.love };
    case 'community.user-followed.v1': return { Icon: UserPlus, color: colors.success };
    default: return { Icon: MessageCircle, color: colors.muted };
  }
}

type Section = { title: string; data: Notification[] };

/** Stable day buckets: marking one as read never moves it between sections. */
function groupByDay(items: Notification[]): Section[] {
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const startOfWeek = startOfToday - 6 * 86_400_000;
  const buckets: Section[] = [
    { title: 'Hôm nay', data: [] },
    { title: '7 ngày qua', data: [] },
    { title: 'Trước đó', data: [] },
  ];
  for (const item of items) {
    const at = new Date(item.createdAt).getTime();
    (at >= startOfToday ? buckets[0] : at >= startOfWeek ? buckets[1] : buckets[2]).data.push(item);
  }
  return buckets.filter((bucket) => bucket.data.length > 0);
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
  const { Icon, color } = eventBadge(item.eventType);
  const name = actor?.displayName ?? 'Thành viên';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Chưa đọc. ' : ''}${name} ${eventLabel(item.eventType)}`}
      onPress={() => onOpen(item)}
      className="min-h-[76px] flex-row items-center px-4 py-3 active:opacity-80"
      style={{ backgroundColor: unread ? colors.accentSoft : colors.canvas }}>
      <View>
        <CommunityAvatar uri={actor?.avatarUrl} name={actor?.displayName} size={46} />
        <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border-2" style={{ backgroundColor: colors.surface, borderColor: unread ? colors.accentSoft : colors.canvas }}>
          <Icon size={12} color={color} fill={item.eventType === 'community.post-reacted.v1' ? color : 'transparent'} />
        </View>
      </View>
      <View className="ml-3.5 flex-1">
        <Text className="text-[15px] leading-5">
          <Text weight="bold">{name}</Text>
          <Text className="text-muted"> {eventLabel(item.eventType)}.</Text>
        </Text>
        <Text weight={unread ? 'semibold' : 'regular'} className="mt-1 text-xs" style={{ color: unread ? colors.accentDeep : colors.muted }}>{timeAgo(item.createdAt)}</Text>
      </View>
      {unread ? <View className="ml-3 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.accent }} /> : null}
    </Pressable>
  );
});

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const list = useInfiniteQuery({
    queryKey: notificationsKey,
    queryFn: ({ pageParam }) => communityApi.notifications(Number(pageParam), 20),
    initialPageParam: 0 as number,
    getNextPageParam: (last, pages) => (notificationHasNext(last, 20) ? pages.length : undefined),
  });
  const unread = useQuery({ queryKey: unreadKey, queryFn: communityApi.unread });
  const unreadCount = unread.data?.count ?? 0;
  const sections = useMemo(() => groupByDay(list.data?.pages.flat() ?? []), [list.data]);

  const refresh = useCallback(async () => {
    await Promise.all([list.refetch(), unread.refetch()]);
  }, [list.refetch, unread.refetch]);

  const markAll = useCallback(async () => {
    const previousList = queryClient.getQueryData<InfiniteData<Notification[]>>(notificationsKey);
    const previousUnread = queryClient.getQueryData<{ count: number }>(unreadKey);
    const readAt = new Date().toISOString();
    haptics.tap();
    queryClient.setQueryData<InfiniteData<Notification[]>>(notificationsKey, (data) => data && ({
      ...data, pages: data.pages.map((page) => page.map((row) => (row.readAt ? row : { ...row, readAt }))),
    }));
    queryClient.setQueryData(unreadKey, { count: 0 });
    try {
      await communityApi.markAll();
    } catch (error) {
      queryClient.setQueryData(notificationsKey, previousList);
      queryClient.setQueryData(unreadKey, previousUnread);
      haptics.error();
      Alert.alert('Chưa thể cập nhật', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    }
  }, [queryClient]);

  const openNotification = useCallback(async (item: Notification) => {
    try {
      if (!item.readAt) {
        // Reflect the read state immediately; the list keeps its scroll position.
        const readAt = new Date().toISOString();
        queryClient.setQueryData<InfiniteData<Notification[]>>(notificationsKey, (data) => data && ({
          ...data, pages: data.pages.map((page) => page.map((row) => (row.id === item.id ? { ...row, readAt } : row))),
        }));
        queryClient.setQueryData<{ count: number }>(unreadKey, (data) => data && ({ count: Math.max(0, data.count - 1) }));
        try { await communityApi.markRead(item.id); }
        catch (error) {
          void queryClient.invalidateQueries({ queryKey: notificationsKey });
          void queryClient.invalidateQueries({ queryKey: unreadKey });
          throw error;
        }
      }
      if (item.eventType === 'community.user-followed.v1') router.push(`/community/users/${item.actorId}` as never);
      else if (item.postId) router.push({ pathname: '/community/[postId]', params: { postId: item.postId, commentId: item.commentId ?? '' } } as never);
      else Alert.alert('Nội dung không còn khả dụng', 'Thông báo đã được đánh dấu là đã đọc.');
    } catch (error) {
      Alert.alert('Chưa thể mở thông báo', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    }
  }, [queryClient, router]);

  let empty: React.ReactElement;
  if (list.isPending) {
    empty = (
      <View className="gap-5 px-4 pt-5" accessibilityLabel="Đang tải thông báo" accessibilityRole="progressbar">
        {[0, 1, 2, 3].map((row) => (
          <View key={row} className="flex-row items-center">
            <Skeleton width={46} height={46} radius={23} />
            <View className="ml-3.5 flex-1 gap-2"><Skeleton height={13} /><Skeleton height={10} width="40%" /></View>
          </View>
        ))}
      </View>
    );
  } else if (list.isError) {
    empty = (
      <View className="px-4 pt-6">
        <Text weight="bold">Không tải được thông báo</Text>
        <Text className="mt-1 text-sm text-muted">{list.error instanceof Error ? list.error.message : 'Hãy kiểm tra kết nối rồi thử lại.'}</Text>
        <View className="mt-4"><Button label="Thử lại" onPress={() => void refresh()} /></View>
      </View>
    );
  } else {
    empty = (
      <View className="items-center px-8 pt-20">
        <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: colors.accentSoft }}><BellOff size={28} color={colors.accent} /></View>
        <Text weight="extrabold" className="mt-4 text-center text-lg">Chưa có thông báo</Text>
        <Text className="mt-2 text-center text-sm leading-5 text-muted">Khi ai đó thích, bình luận hoặc theo dõi bạn, bạn sẽ thấy ở đây.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <BackHeader
        title="Thông báo"
        subtitle={unreadCount > 0 ? `${unreadCount} chưa đọc` : undefined}
        fallbackHref="/(tabs)/community"
        rightAction={
          <>
            {unreadCount > 0 ? (
              <Pressable onPress={() => void markAll()} accessibilityRole="button" accessibilityLabel="Đánh dấu tất cả là đã đọc" className="h-11 flex-row items-center gap-1.5 rounded-full px-3 active:opacity-70" style={{ backgroundColor: colors.accentSoft }}>
                <CheckCheck size={16} color={colors.accentDeep} /><Text weight="bold" className="text-xs text-accent-deep">Đọc hết</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => router.push('/community/notification-preferences' as never)} accessibilityRole="button" accessibilityLabel="Tuỳ chọn thông báo" className="h-11 w-11 items-center justify-center rounded-full active:bg-tint">
              <Settings size={20} color={colors.ink} />
            </Pressable>
          </>
        }
      />
      <SectionList<Notification, Section>
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationRow item={item} onOpen={openNotification} />}
        renderSectionHeader={({ section }) => (
          <Text weight="extrabold" className="bg-canvas px-4 pb-2 pt-4 text-[13px] uppercase tracking-wider text-muted">{section.title}</Text>
        )}
        stickySectionHeadersEnabled
        ListEmptyComponent={empty}
        ListFooterComponent={
          <>
            {list.isFetchingNextPage ? <ActivityIndicator className="py-4" color={colors.accent} /> : null}
            {list.isFetchNextPageError ? <Pressable onPress={() => void list.fetchNextPage()} className="min-h-11 items-center justify-center"><Text weight="bold" className="text-accent">Thử tải lại</Text></Pressable> : null}
          </>
        }
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerClassName="pb-10"
        refreshControl={<RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={() => void refresh()} tintColor={colors.accent} />}
      />
    </View>
  );
}
