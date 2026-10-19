import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { CheckCheck, ChevronLeft, Settings, Sparkles } from 'lucide-react-native';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { communityApi, type Notification } from '@/src/features/community/api';
import { CommunityAvatar } from '@/src/features/community/components/community-image';
import { colors } from '@/src/theme';

const eventLabels: Record<string, string> = {
  POST_REACTION: 'đã bày tỏ cảm xúc về bài viết của bạn',
  COMMENT: 'đã bình luận về bài viết của bạn',
  COMMENT_REPLY: 'đã trả lời bình luận của bạn',
  FOLLOW: 'đã bắt đầu theo dõi bạn',
  MENTION: 'đã nhắc đến bạn',
};
function eventLabel(type: string) { return eventLabels[type] ?? type.replaceAll('_', ' ').toLowerCase(); }

function NotificationRow({ item, onOpen }: { item: Notification; onOpen: (item: Notification) => void }) {
  const unread = !item.readAt;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${item.actor?.displayName ?? 'Thành viên'} ${eventLabel(item.eventType)}`} onPress={() => onOpen(item)} className={`mb-3 min-h-[76px] flex-row items-center rounded-2xl border px-4 py-3 ${unread ? 'border-blue-100 bg-blue-50' : 'border-line bg-white'}`}>
    <CommunityAvatar uri={item.actor?.avatarUrl} name={item.actor?.displayName} size={42} />
    <View className="ml-3 flex-1"><Text className="text-sm leading-5"><Text weight={unread ? 'bold' : 'regular'}>{item.actor?.displayName ?? 'Thành viên'}</Text><Text className="text-muted">{` ${eventLabel(item.eventType)}.`}</Text></Text>
      <Text className="mt-1 text-xs text-muted">{new Date(item.createdAt).toLocaleString('vi-VN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text></View>
    {unread ? <View className="ml-3 h-2.5 w-2.5 rounded-full bg-accent" /> : null}
  </Pressable>;
}

export default function NotificationsScreen() {
  const router = useRouter(); const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ['community', 'notifications'], queryFn: communityApi.notifications });
  const unread = useQuery({ queryKey: ['community', 'unread'], queryFn: communityApi.unread });
  const refresh = async () => { await Promise.all([list.refetch(), unread.refetch()]); };
  const markAll = async () => { try {
    await communityApi.markAll();
    await queryClient.invalidateQueries({ queryKey: ['community', 'notifications'] });
    await queryClient.invalidateQueries({ queryKey: ['community', 'unread'] });
  } catch (error) { Alert.alert('Chưa thể cập nhật', error instanceof Error ? error.message : 'Vui lòng thử lại.'); } };
  const openNotification = async (item: Notification) => { try {
    if (!item.readAt) { await communityApi.markRead(item.id); await queryClient.invalidateQueries({ queryKey: ['community', 'unread'] }); await queryClient.invalidateQueries({ queryKey: ['community', 'notifications'] }); }
    if (item.postId) router.push(`/community/${item.postId}` as never);
  } catch (error) { Alert.alert('Chưa thể mở thông báo', error instanceof Error ? error.message : 'Vui lòng thử lại.'); } };

  return <View className="flex-1 bg-canvas">
    <View className="border-b border-line bg-white px-4 pb-4 pt-3">
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full bg-slate-50" accessibilityLabel="Quay lại"><ChevronLeft size={21} color={colors.ink} /></Pressable>
        <Text weight="black" className="text-lg">Thông báo</Text>
        <Pressable onPress={() => router.push('/community/notification-preferences' as never)} className="h-11 w-11 items-center justify-center rounded-full bg-slate-50" accessibilityLabel="Tuỳ chọn thông báo"><Settings size={19} color={colors.ink} /></Pressable>
      </View>
      <View className="mt-4 flex-row items-center justify-between">
        <View><Text weight="bold" className="text-2xl">Hoạt động</Text><Text className="mt-1 text-sm text-muted">{unread.data?.count ?? 0} thông báo chưa đọc</Text></View>
        <Pressable disabled={!unread.data?.count} onPress={() => void markAll()} className="min-h-11 flex-row items-center gap-2 rounded-full bg-accent-soft px-4"><CheckCheck size={16} color={colors.accent} /><Text weight="semibold" className="text-xs text-accent">Đọc tất cả</Text></Pressable>
      </View>
    </View>
    <ScrollView contentContainerClassName="px-4 pb-10 pt-4" refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void refresh()} tintColor={colors.accent} />}>
      {list.isPending ? <View className="items-center py-16"><ActivityIndicator color={colors.accent} /><Text className="mt-3 text-sm text-muted">Đang tải hoạt động…</Text></View>
        : list.isError ? <Pressable onPress={() => void refresh()} className="items-center rounded-3xl border border-line bg-white p-6"><Text weight="bold">Không tải được thông báo</Text><Text className="mt-2 text-sm text-accent">Chạm để thử lại</Text></Pressable>
        : list.data?.length ? list.data.map((item) => <NotificationRow key={item.id} item={item} onOpen={(notification) => void openNotification(notification)} />)
        : <View className="items-center rounded-3xl border border-line bg-white px-7 py-10"><View className="h-16 w-16 items-center justify-center rounded-full bg-accent-soft"><Sparkles size={28} color={colors.accent} /></View><Text weight="bold" className="mt-4 text-lg">Bạn đã cập nhật hết rồi</Text><Text className="mt-2 text-center text-sm leading-5 text-muted">Khi có người tương tác với bạn, thông báo sẽ xuất hiện ở đây.</Text></View>}
    </ScrollView>
  </View>;
}
