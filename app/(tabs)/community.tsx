import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Bookmark, CheckCircle2, ChevronDown, Heart, Image as ImageIcon, Lightbulb, MessageCircle, MoreHorizontal, Search, ThumbsUp, Users, Bell } from 'lucide-react-native';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { useAuth, useCurrentUser } from '@/src/features/auth/auth-provider';
import { communityApi, type CommunityPost, type PostCategory, type ReactionType } from '@/src/features/community/api';
import { communityCategoryColor } from '@/src/features/community/community-colors';
import { CommunityAvatar, CommunityImage } from '@/src/features/community/components/community-image';
import { colors } from '@/src/theme';

const categories: { key?: PostCategory; label: string }[] = [
  { label: 'Tất cả chủ đề' }, { key: 'GENERAL', label: 'Chung' }, { key: 'QUESTION', label: 'Hỏi đáp' },
  { key: 'DISCUSSION', label: 'Thảo luận' }, { key: 'WRITING_SHARING', label: 'Chia sẻ Writing' },
  { key: 'SPEAKING_PARTNER', label: 'Tìm bạn Speaking' }, { key: 'RESOURCE_TIPS', label: 'Tài nguyên & mẹo' },
];
const categoryNames: Record<PostCategory, string> = {
  GENERAL: 'Chung', QUESTION: 'Hỏi đáp', DISCUSSION: 'Thảo luận', WRITING_SHARING: 'Chia sẻ Writing', SPEAKING_PARTNER: 'Tìm bạn Speaking', RESOURCE_TIPS: 'Tài nguyên & mẹo',
};
const reactionMeta: Record<ReactionType, { label: string; icon: typeof ThumbsUp; color: string }> = {
  LIKE: { label: 'Thích', icon: ThumbsUp, color: '#1877f2' }, LOVE: { label: 'Yêu thích', icon: Heart, color: '#e41e3f' },
  HELPFUL: { label: 'Hữu ích', icon: Lightbulb, color: '#d97706' }, ACCURATE: { label: 'Chính xác', icon: CheckCircle2, color: '#059669' },
};
const backgroundColors: Record<string, string> = { VIOLET: '#5b21b6', CRIMSON: '#9f1239', MIDNIGHT: '#0f172a', SUNSET: '#9a3412', OCEAN: '#075985', FOREST: '#065f46', ROSE: '#86198f', AURORA: '#115e59' };
const feedKey = ['community', 'feed'] as const;
function timeLabel(value: string) {
  const date = new Date(value); const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'Vừa xong'; if (seconds < 3600) return `${Math.floor(seconds / 60)} phút`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ`; return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function reportPost(post: CommunityPost, run: (fn: () => Promise<unknown>) => Promise<void>) {
  Alert.alert('Báo cáo bài viết', 'Chọn lý do phù hợp:', [
    ...['Spam', 'Nội dung không phù hợp', 'Thông tin sai lệch'].map((reason) => ({ text: reason, onPress: () => void run(() => communityApi.report('POST', post.id, reason)) })),
    { text: 'Hủy', style: 'cancel' },
  ]);
}
const CommunityCard = memo(function CommunityCard({ post, userId, onOpen }: { post: CommunityPost; userId?: string; onOpen: (id: string) => void }) {
  const router = useRouter(); const qc = useQueryClient(); const own = userId === post.authorId; const [showReactions, setShowReactions] = useState(false); const [actionBusy, setActionBusy] = useState(false);
  const selected = post.myReaction as ReactionType | null | undefined; const selectedMeta = selected ? reactionMeta[selected] : undefined;
  const run = async (op: () => Promise<unknown>, keys: readonly (readonly unknown[])[] = [feedKey]) => {
    if (actionBusy) return;
    setActionBusy(true);
    try { await op(); await Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey }))); }
    catch (e) { Alert.alert('Không thể cập nhật', e instanceof Error ? e.message : 'Vui lòng thử lại.'); }
    finally { setActionBusy(false); }
  };
  const selectReaction = (type: ReactionType) => { setShowReactions(false); void run(() => selected === type ? communityApi.removeReaction(post.id, type) : communityApi.react(post.id, type)); };
  const total = Object.values(post.reactionCounts ?? {}).reduce((sum, count) => sum + count, 0);
  const report = () => reportPost(post, run);
  const ownerMenu = () => Alert.alert(own ? 'Quản lý bài viết' : 'Tuỳ chọn bài viết', undefined, [
    ...(own ? [
      { text: 'Sửa bài viết', onPress: () => router.push({ pathname: '/community/composer', params: { id: post.id } } as never) },
      { text: 'Xóa bài viết', style: 'destructive' as const, onPress: () => Alert.alert('Xóa bài viết?', 'Bài viết sẽ bị gỡ khỏi cộng đồng.', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: () => void run(() => communityApi.delete(post.id), [['community', 'feed'], ['community', 'bookmarks'], ['community', 'profile-list']]) }]) },
    ] : [
      { text: post.followingAuthor ? 'Bỏ theo dõi' : 'Theo dõi', onPress: () => void run(() => communityApi.follow(post.authorId, post.followingAuthor), [['community', 'feed'], ['community', 'detail']]) },
      { text: 'Báo cáo bài viết', onPress: report },
    ]),
    { text: 'Đóng', style: 'cancel' },
  ]);
  return <View className="mb-4 overflow-hidden rounded-3xl border border-line bg-surface" style={{ shadowColor: '#14213d', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}>
    <View className="flex-row items-center px-4 pb-3 pt-4">
      <Pressable onPress={() => router.push(`/community/users/${post.authorId}` as never)} accessibilityRole="button" accessibilityLabel={`Hồ sơ ${post.author?.displayName ?? 'thành viên'}`}><CommunityAvatar uri={post.author?.avatarUrl} name={post.author?.displayName} size={44} /></Pressable>
      <View className="ml-3 flex-1">
        <Pressable onPress={() => router.push(`/community/users/${post.authorId}` as never)}><Text weight="bold" className="text-sm">{post.author?.displayName ?? 'Học viên IELTSPath'}</Text></Pressable>
        <View className="mt-1 flex-row items-center"><Text className="text-xs text-muted">{timeLabel(post.createdAt)}</Text><Text className="mx-1 text-xs text-muted">·</Text><View className="rounded-full border px-2 py-0.5" style={{ backgroundColor: communityCategoryColor(post.category).background, borderColor: communityCategoryColor(post.category).border }}><Text weight="bold" className="text-[10px]" style={{ color: communityCategoryColor(post.category).foreground }}>{categoryNames[post.category] ?? post.category}</Text></View>{post.targetBand != null ? <Text className="ml-2 text-xs text-muted">· Target {post.targetBand}</Text> : null}</View>
      </View>
      <Pressable onPress={ownerMenu} disabled={actionBusy} className="h-10 w-10 items-center justify-center rounded-full" accessibilityRole="button" accessibilityLabel="Tùy chọn bài viết"><MoreHorizontal size={21} color={colors.muted} /></Pressable>
    </View>
    <Pressable onPress={() => onOpen(post.id)}>
      {post.title ? <Text weight="bold" className="px-4 pb-1 text-base">{post.title}</Text> : null}
      <Text numberOfLines={5} className={`px-4 pb-3 text-sm leading-6 ${post.background && !post.imageUrls?.length ? 'px-4 py-5 text-white' : 'text-ink'}`} style={post.background && !post.imageUrls?.length ? { backgroundColor: backgroundColors[post.background] ?? colors.accentDeep } : undefined}>{post.body}</Text>
      {post.imageUrls?.length ? <Pressable onPress={() => onOpen(post.id)}><View className="flex-row flex-wrap">
        {post.imageUrls.slice(0, 4).map((url, index) => <View key={`${url}-${index}`} className={post.imageUrls.length === 1 ? 'w-full p-0.5' : 'w-1/2 p-0.5'}><CommunityImage uri={url} label={`Ảnh ${index + 1} trong bài viết`} className={`w-full ${post.imageUrls.length === 1 ? 'h-72' : 'h-44'}`} /></View>)}
      </View></Pressable> : null}
    </Pressable>
    {total > 0 ? <View className="flex-row items-center px-4 pb-2 pt-3"><View className="mr-2 flex-row">{(Object.entries(post.reactionCounts ?? {}) as [ReactionType, number][]).filter(([, count]) => count > 0).slice(0, 3).map(([type]) => { const MetaIcon = reactionMeta[type]?.icon ?? ThumbsUp; return <View key={type} className="-ml-1 h-5 w-5 items-center justify-center rounded-full border border-white bg-surface"><MetaIcon size={14} color={reactionMeta[type]?.color ?? colors.accent} fill={type === 'LOVE' ? reactionMeta[type].color : 'transparent'} /></View>; })}</View><Text className="text-xs text-muted">{total}</Text><Text className="ml-auto text-xs text-muted">{post.commentCount} bình luận</Text></View> : <View className="h-px bg-slate-100 mx-4" />}
    <View className="mx-4 border-t border-line" />
    {showReactions ? <View className="flex-row justify-around px-2 pt-2">{(Object.keys(reactionMeta) as ReactionType[]).map((type) => { const item = reactionMeta[type]; const Icon = item.icon; return <Pressable key={type} disabled={actionBusy} onPress={() => selectReaction(type)} className="items-center rounded-xl px-2 py-2" accessibilityLabel={item.label}><Icon size={20} color={item.color} /><Text className="mt-1 text-[10px]" style={{ color: item.color }}>{item.label}</Text></Pressable>; })}</View> : null}
    <View className="flex-row items-center justify-around px-1 py-1">
      <View className="flex-1 flex-row items-center"><Pressable disabled={actionBusy} onPress={() => selected ? selectReaction(selected) : selectReaction('LIKE')} onLongPress={() => setShowReactions(true)} delayLongPress={350} className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-lg" accessibilityRole="button" accessibilityLabel="Thả cảm xúc"><ThumbsUp size={18} color={selectedMeta?.color ?? colors.muted} fill={selected === 'LIKE' ? colors.accent : 'transparent'} /><Text weight="semibold" className="text-xs" style={{ color: selectedMeta?.color ?? colors.muted }}>{selectedMeta?.label ?? 'Thích'}</Text></Pressable><Pressable disabled={actionBusy} onPress={() => setShowReactions((open) => !open)} className="h-11 w-9 items-center justify-center rounded-lg" accessibilityRole="button" accessibilityLabel="Chọn cảm xúc khác" accessibilityState={{ expanded: showReactions }}><ChevronDown size={15} color={colors.muted} /></Pressable></View>
      <Pressable onPress={() => onOpen(post.id)} className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-lg"><MessageCircle size={18} color={colors.muted} /><Text weight="semibold" className="text-xs text-muted">Bình luận</Text></Pressable>
      <Pressable onPress={() => void run(() => communityApi.bookmark(post.id, post.bookmarkedByMe), [feedKey, ['community', 'bookmarks'], ['community', 'detail', post.id]])} disabled={actionBusy} className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-lg"><Bookmark size={18} color={post.bookmarkedByMe ? colors.accent : colors.muted} fill={post.bookmarkedByMe ? colors.accent : 'transparent'} /><Text weight="semibold" className="text-xs" style={{ color: post.bookmarkedByMe ? colors.accent : colors.muted }}>{post.bookmarkedByMe ? 'Đã lưu' : 'Lưu'}</Text></Pressable>
    </View>
  </View>;
});

export default function CommunityScreen() {
  const router = useRouter(); const { authEnabled, status } = useAuth(); const user = useCurrentUser(); const [scope, setScope] = useState<'ALL' | 'FOLLOWING'>('ALL');
  const [category, setCategory] = useState<PostCategory | undefined>(); const [search, setSearch] = useState(''); const [q, setQ] = useState('');
  useEffect(() => { const id = setTimeout(() => setQ(search.trim().slice(0, 120)), 350); return () => clearTimeout(id); }, [search]);
  const feed = useInfiniteQuery({ queryKey: [...feedKey, scope, category, q], enabled: authEnabled && status === 'authenticated', staleTime: 0, initialPageParam: undefined as string | undefined, queryFn: ({ pageParam }) => communityApi.feed(pageParam, scope, category, q), getNextPageParam: (last) => last.hasNext ? last.nextCursor ?? undefined : undefined });
  const posts = useMemo(() => {
    const seen = new Set<string>();
    return (feed.data?.pages.flatMap((page) => page.content) ?? []).filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
  }, [feed.data]);
  const refresh = useCallback(() => { void feed.refetch(); }, [feed.refetch]);
  const openPost = useCallback((id: string) => router.push(`/community/${id}` as never), [router]);
  const header = <View>
    <View className="border-b border-line bg-surface px-4 pb-3 pt-4"><View className="overflow-hidden rounded-3xl px-5 py-5" style={{ backgroundColor: colors.heroStart }}><View className="absolute -right-5 -top-9 h-28 w-28 rounded-full" style={{ backgroundColor: colors.heroEnd, opacity: 0.6 }} /><View className="absolute right-20 top-14 h-4 w-4 rounded-full" style={{ backgroundColor: colors.accentWarm }} /><View className="flex-row items-center justify-between"><View><View className="mb-2 flex-row items-center"><View className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: colors.accentWarm }} /><Text weight="bold" className="text-[10px] uppercase tracking-[2px] text-white">IELTSPath · Học cùng nhau</Text></View><Text weight="black" className="text-2xl text-white">Cộng đồng</Text><Text className="mt-1 text-xs text-blue-100">Cùng nhau tiến bộ mỗi ngày</Text></View><View className="flex-row gap-2"><Pressable onPress={() => router.push('/community/notifications' as never)} className="h-11 w-11 items-center justify-center rounded-full bg-surface/15" accessibilityLabel="Thông báo"><Bell size={19} color="white" /></Pressable><Pressable onPress={() => router.push('/community/bookmarked' as never)} className="h-11 w-11 items-center justify-center rounded-full bg-surface/15" accessibilityLabel="Bài viết đã lưu"><Bookmark size={19} color="white" /></Pressable></View></View></View></View>
    {status === 'loading' ? <View className="py-16"><ActivityIndicator color={colors.accent} /></View> : status !== 'authenticated' ? <View className="px-4 pt-4"><Card className="rounded-3xl border-b-0 bg-surface p-5"><Users size={28} color={colors.accent} /><Text weight="extrabold" className="mt-3 text-lg">Đăng nhập để tham gia cộng đồng</Text><Text className="mt-2 text-sm text-muted">Chia sẻ câu hỏi, theo dõi bài viết và trao đổi cùng người học khác.</Text><View className="mt-4"><Button label="Đăng nhập" onPress={() => router.push('/(auth)/login' as never)} /></View></Card></View> : <View className="px-4 pt-4"><View className="rounded-3xl border border-line bg-surface p-4"><View className="flex-row items-center"><CommunityAvatar name={user.data?.fullName} /><Pressable onPress={() => router.push('/community/composer' as never)} className="ml-3 min-h-11 flex-1 justify-center rounded-full bg-canvas px-4"><Text className="text-sm text-muted">{user.data?.fullName ? `${user.data.fullName}, bạn đang nghĩ gì?` : 'Bạn đang nghĩ gì?'}</Text></Pressable><Pressable onPress={() => router.push('/community/composer' as never)} className="ml-2 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.successSoft }} accessibilityLabel="Thêm ảnh"><ImageIcon size={19} color={colors.success} /></Pressable></View></View><View className="mt-4 flex-row rounded-2xl p-1.5" style={{ backgroundColor: colors.surfaceTint }}><Pressable onPress={() => setScope('ALL')} className="flex-1 items-center rounded-lg py-2.5" style={{ backgroundColor: scope === 'ALL' ? colors.surface : 'transparent' }}><Text weight="bold" className="text-sm" style={{ color: scope === 'ALL' ? colors.accent : colors.muted }}>Tất cả</Text></Pressable><Pressable onPress={() => setScope('FOLLOWING')} className="flex-1 items-center rounded-lg py-2.5" style={{ backgroundColor: scope === 'FOLLOWING' ? colors.surface : 'transparent' }}><Text weight="bold" className="text-sm" style={{ color: scope === 'FOLLOWING' ? colors.accent : colors.muted }}>Đang theo dõi</Text></Pressable></View><View className="mt-3 flex-row items-center rounded-2xl border border-line bg-surface px-4"><Search size={17} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Tìm bài viết" placeholderTextColor={colors.muted} className="min-h-11 flex-1 px-2 text-ink" returnKeyType="search" /></View><ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerClassName="pb-2">{categories.map((item) => { const selected = category === item.key; const palette = item.key ? communityCategoryColor(item.key) : colors.community.general; return <Pressable key={item.key ?? 'all'} onPress={() => setCategory(item.key)} className="mr-2 min-h-11 justify-center rounded-full border px-3.5" style={{ backgroundColor: selected ? palette.background : colors.surface, borderColor: selected ? palette.border : colors.line }}><Text weight="bold" className="text-xs" style={{ color: selected ? palette.foreground : colors.muted }}>{item.label}</Text></Pressable>; })}</ScrollView></View>}
  </View>;
  const empty = status !== 'authenticated' ? null : feed.isPending ? <View className="py-12"><ActivityIndicator color={colors.accent} /></View> : feed.isError ? <Card className="mx-4 mt-3 rounded-3xl border-b-0 bg-surface p-5"><FormAlert tone="error" message={feed.error instanceof Error ? feed.error.message : 'Không tải được bảng tin.'} /><View className="mt-3"><Button label="Thử lại" onPress={() => void feed.refetch()} /></View></Card> : <Card className="mx-4 mt-3 rounded-3xl border-b-0 bg-surface p-5"><Text weight="extrabold" className="text-center">Chưa có bài viết</Text><Text className="mt-2 text-center text-sm leading-5 text-muted">Bảng tin đang trống. Hãy là người đầu tiên chia sẻ điều bạn đang học.</Text><View className="mt-4"><Button label="Viết bài đầu tiên" onPress={() => router.push('/community/composer' as never)} /></View></Card>;
  return <FlatList className="flex-1 bg-canvas" contentContainerClassName="pb-28" data={status === 'authenticated' ? posts : []} keyExtractor={(post) => post.id} renderItem={({ item }) => <View className="px-4 pt-3"><CommunityCard post={item} userId={user.data?.id} onOpen={openPost} /></View>} ListHeaderComponent={header} ListEmptyComponent={empty ?? undefined} ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator className="py-5" color={colors.accent} /> : posts.length > 0 && !feed.hasNextPage ? <Text className="py-5 text-center text-xs text-muted">Bạn đã xem hết bảng tin</Text> : undefined} onEndReached={() => { if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage(); }} onEndReachedThreshold={0.6} refreshControl={<RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={() => void feed.refetch()} tintColor={colors.accent} />} />;
}
