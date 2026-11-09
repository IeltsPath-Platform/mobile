import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { AtSign, CheckCheck, CornerDownRight, Heart, MessageCircle, Settings, UserPlus, type LucideIcon } from 'lucide-react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, SectionList, View } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { useTabBarScrollHandler } from '@/src/components/navigation/tab-reselect-context';
import { Button } from '@/src/components/ui/button';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Text } from '@/src/components/ui/text';
import { communityApi, notificationHasNext, type Notification } from '@/src/features/community/api';
import { CommunityAvatar } from '@/src/features/community/components/community-image';
import { timeAgo } from '@/src/features/community/format';
import { useUnread } from '@/src/features/community/use-unread';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

const notificationsKey = ['community', 'notifications'] as const;
const unreadKey = ['community', 'unread'] as const;
/** The list is only re-requested on focus once it is older than this, so tab switches never flash a spinner. */
const FOCUS_REFRESH_AFTER_MS = 30_000;

const eventLabels: Record<string, string> = {
  'community.post-commented.v1': 'đã bình luận về bài viết của bạn',
  'community.comment-replied.v1': 'đã trả lời bình luận của bạn',
  'community.comment-mentioned.v1': 'đã nhắc đến bạn trong bình luận',
  'community.post-reacted.v1': 'đã bày tỏ cảm xúc về bài viết của bạn',
  'community.user-followed.v1': 'đã bắt đầu theo dõi bạn',
};

function eventLabel(type: string) {
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

/** 2px frame with a 4px bottom edge; the highlighted variant switches to the accent palette. */
function frameStyle(highlighted = false) {
  return {
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: highlighted ? colors.accent : colors.line,
    borderBottomColor: highlighted ? colors.accentShade : colors.edge,
    backgroundColor: highlighted ? colors.accentSoft : colors.surface,
  };
}

type Section = { title: string; data: Notification[] };
type Filter = 'all' | 'unread';

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
  const label = eventLabel(item.eventType);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Chưa đọc. ' : ''}${name} ${label}`}
      onPress={() => onOpen(item)}
      className="mx-4 mb-2.5 min-h-[80px] flex-row items-center rounded-3xl px-4 py-3 active:opacity-80"
      style={frameStyle(unread)}>
      <View>
        <CommunityAvatar uri={actor?.avatarUrl} name={actor?.displayName} size={48} />
        <View
          className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.surface, borderWidth: 2, borderColor: unread ? colors.accentSoft : colors.surface }}>
          <Icon size={12} color={color} fill={item.eventType === 'community.post-reacted.v1' ? color : 'transparent'} />
        </View>
      </View>
      <View className="ml-3.5 flex-1">
        <Text className="text-base leading-[22px]" numberOfLines={3}>
          <Text weight="black">{name}</Text>
          <Text className="text-ink"> {label}.</Text>
        </Text>
        <Text weight="bold" className="mt-1 text-xs" style={{ color: unread ? colors.accentDeep : colors.muted }}>{timeAgo(item.createdAt)}</Text>
      </View>
      {unread ? <View className="ml-3 h-3 w-3 rounded-full" style={{ backgroundColor: colors.accent }} /> : null}
    </Pressable>
  );
});

function IconAction({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-12 w-12 items-center justify-center rounded-2xl active:opacity-70"
      style={frameStyle()}>
      {children}
    </Pressable>
  );
}

export default function NotificationsScreen({ inTab = false }: { inTab?: boolean }) {
  useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const handleTabBarScroll = useTabBarScrollHandler();
  const [filter, setFilter] = useState<Filter>('all');
  const [pulling, setPulling] = useState(false);
  const list = useInfiniteQuery({
    queryKey: notificationsKey,
    queryFn: ({ pageParam }) => communityApi.notifications(Number(pageParam), 20),
    initialPageParam: 0 as number,
    getNextPageParam: (last, pages) => (notificationHasNext(last, 20) ? pages.length : undefined),
    staleTime: FOCUS_REFRESH_AFTER_MS,
  });
  const unread = useUnread();
  const unreadCount = unread.data?.count ?? 0;

  // Resync quietly when the tab regains focus, but only if the list is old: no spinner, no re-request on every tap.
  useFocusEffect(useCallback(() => {
    const updatedAt = queryClient.getQueryState(notificationsKey)?.dataUpdatedAt;
    if (!updatedAt || Date.now() - updatedAt < FOCUS_REFRESH_AFTER_MS) return;
    void queryClient.invalidateQueries({ queryKey: notificationsKey }, { cancelRefetch: false });
    void queryClient.invalidateQueries({ queryKey: unreadKey }, { cancelRefetch: false });
  }, [queryClient]));

  const sections = useMemo(() => {
    const all = list.data?.pages.flat() ?? [];
    return groupByDay(filter === 'unread' ? all.filter((item) => !item.readAt) : all);
  }, [list.data, filter]);

  // Only a deliberate pull shows the refresh spinner.
  const refresh = useCallback(async () => {
    setPulling(true);
    try {
      await Promise.all([list.refetch(), unread.refetch()]);
    } finally {
      setPulling(false);
    }
  }, [list.refetch, unread.refetch]);

  const markAll = useCallback(async () => {
    await queryClient.cancelQueries({ queryKey: notificationsKey });
    await queryClient.cancelQueries({ queryKey: unreadKey });
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

  const openNotification = useCallback((item: Notification) => {
    if (!item.readAt) {
      // Reflect the read state immediately and mark read in the background; navigation never waits on it.
      void (async () => {
        await queryClient.cancelQueries({ queryKey: notificationsKey });
        await queryClient.cancelQueries({ queryKey: unreadKey });
        const readAt = new Date().toISOString();
        queryClient.setQueryData<InfiniteData<Notification[]>>(notificationsKey, (data) => data && ({
          ...data, pages: data.pages.map((page) => page.map((row) => (row.id === item.id ? { ...row, readAt } : row))),
        }));
        queryClient.setQueryData<{ count: number }>(unreadKey, (data) => data && ({ count: Math.max(0, data.count - 1) }));
        try {
          await communityApi.markRead(item.id);
        } catch {
          void queryClient.invalidateQueries({ queryKey: notificationsKey });
          void queryClient.invalidateQueries({ queryKey: unreadKey });
        }
      })();
    }
    if (item.eventType === 'community.user-followed.v1') router.push(`/community/users/${item.actorId}` as never);
    else if (item.postId) router.push({ pathname: '/community/[postId]', params: { postId: item.postId, commentId: item.commentId ?? '' } } as never);
    else Alert.alert('Nội dung không còn khả dụng', 'Thông báo đã được đánh dấu là đã đọc.');
  }, [queryClient, router]);

  let empty: React.ReactElement;
  if (list.isPending) {
    empty = (
      <View className="gap-3 px-4 pt-3" accessibilityLabel="Đang tải thông báo" accessibilityRole="progressbar">
        {[0, 1, 2, 3].map((row) => (
          <View key={row} className="flex-row items-center rounded-3xl p-4" style={frameStyle()}>
            <Skeleton width={48} height={48} radius={24} />
            <View className="ml-3.5 flex-1 gap-2"><Skeleton height={14} /><Skeleton height={10} width="40%" /></View>
          </View>
        ))}
      </View>
    );
  } else if (list.isError) {
    empty = (
      <View className="items-center px-6 pt-10">
        <Text weight="black" className="text-lg">Không tải được thông báo</Text>
        <Text className="mt-1 text-center text-sm text-muted">{list.error instanceof Error ? list.error.message : 'Hãy kiểm tra kết nối rồi thử lại.'}</Text>
        <Button className="mt-4 w-full" label="Thử lại" onPress={() => void refresh()} />
      </View>
    );
  } else {
    empty = (
      <View className="items-center px-8 pt-12">
        <Image source={require('@/assets/images/owl/nav-owl-stand.webp')} contentFit="contain" style={{ width: 120, height: 120 }} accessibilityIgnoresInvertColors />
        <Text weight="black" className="mt-3 text-center text-xl">
          {filter === 'unread' ? 'Bạn đã đọc hết rồi' : 'Chưa có thông báo'}
        </Text>
        <Text className="mt-2 text-center text-base leading-6 text-muted">
          {filter === 'unread' ? 'Không còn thông báo nào chưa đọc.' : 'Khi ai đó thích, bình luận hoặc theo dõi bạn, bạn sẽ thấy ở đây.'}
        </Text>
      </View>
    );
  }

  const actions = (
    <>
      {unreadCount > 0 ? (
        <IconAction label="Đánh dấu tất cả là đã đọc" onPress={() => void markAll()}>
          <CheckCheck size={22} color={colors.accentDeep} />
        </IconAction>
      ) : null}
      <IconAction label="Tuỳ chọn thông báo" onPress={() => router.push('/community/notification-preferences' as never)}>
        <Settings size={22} color={colors.ink} />
      </IconAction>
    </>
  );

  return (
    <View className="flex-1 bg-canvas">
      {inTab ? (
        <Text accessibilityRole="header" weight="black" className="px-5 pt-2 text-[28px] text-ink">
          Thông báo
        </Text>
      ) : (
        <BackHeader title="Thông báo" fallbackHref="/(tabs)/community" rightAction={<View className="flex-row gap-2">{actions}</View>} />
      )}
      <View className="flex-row items-center gap-2 px-4 pb-2 pt-3">
        {(
          [
            { id: 'all', label: 'Tất cả' },
            { id: 'unread', label: unreadCount > 0 ? `Chưa đọc (${unreadCount})` : 'Chưa đọc' },
          ] as const
        ).map((option) => {
          const selected = filter === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setFilter(option.id)}
              className="min-h-12 flex-1 items-center justify-center rounded-2xl active:opacity-80"
              style={frameStyle(selected)}>
              <Text weight="extrabold" style={{ color: selected ? colors.accentDeep : colors.muted }}>{option.label}</Text>
            </Pressable>
          );
        })}
        {inTab ? actions : null}
      </View>
      <SectionList<Notification, Section>
        sections={sections}
        onScroll={handleTabBarScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationRow item={item} onOpen={openNotification} />}
        renderSectionHeader={({ section }) => (
          <Text weight="black" className="bg-canvas px-5 pb-2 pt-3 text-lg text-ink">{section.title}</Text>
        )}
        stickySectionHeadersEnabled
        ListEmptyComponent={empty}
        ListFooterComponent={
          <>
            {list.isFetchingNextPage ? <ActivityIndicator className="py-4" color={colors.accent} /> : null}
            {list.isFetchNextPageError ? <Pressable onPress={() => void list.fetchNextPage()} className="min-h-12 items-center justify-center"><Text weight="bold" className="text-accent">Thử tải lại</Text></Pressable> : null}
          </>
        }
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerClassName="pb-28"
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void refresh()} tintColor={colors.accent} />}
      />
    </View>
  );
}
