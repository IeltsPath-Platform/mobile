import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Bookmark, Heart, MessageCircle } from 'lucide-react-native';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { communityApi } from '@/src/features/community/api';
import { CommunityAvatar, CommunityImage } from '@/src/features/community/components/community-image';
import { colors } from '@/src/theme';

export default function BookmarkedScreen() {
  const router = useRouter(); const qc = useQueryClient();
  const query = useInfiniteQuery({ queryKey: ['community', 'bookmarks'], initialPageParam: undefined as string | undefined, queryFn: ({ pageParam }) => communityApi.bookmarks(pageParam), getNextPageParam: (page) => page.hasNext ? page.nextCursor ?? undefined : undefined });
  const posts = query.data?.pages.flatMap((page) => page.content).filter((post, index, all) => all.findIndex((item) => item.id === post.id) === index) ?? [];
  const remove = async (id: string) => { try { await communityApi.bookmark(id, true); await qc.invalidateQueries({ queryKey: ['community'] }); } catch (error) { Alert.alert('Không thể bỏ lưu', error instanceof Error ? error.message : 'Vui lòng thử lại.'); } };
  return <View className="flex-1 bg-canvas"><View className="border-b border-line bg-white px-4 pb-3 pt-4"><Pressable onPress={() => router.back()} className="min-h-10 justify-center"><Text weight="semibold" className="text-accent">‹  Cộng đồng</Text></Pressable><Text weight="black" className="mt-1 text-2xl">Bài viết đã lưu</Text></View>
    <ScrollView contentContainerClassName="px-4 pb-10 pt-4" refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()} tintColor={colors.accent} />} onScroll={({ nativeEvent }) => { const { contentOffset, layoutMeasurement, contentSize } = nativeEvent; if (contentOffset.y + layoutMeasurement.height > contentSize.height - 350 && query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }} scrollEventThrottle={250}>
      {query.isPending ? <View className="py-12"><ActivityIndicator color={colors.accent} /></View> : query.isError ? <Card><Text>Không tải được bài viết đã lưu.</Text><View className="mt-3"><Button label="Thử lại" onPress={() => void query.refetch()} /></View></Card> : posts.length === 0 ? <Card><Bookmark size={26} color={colors.accent} /><Text weight="bold" className="mt-3 text-center">Bạn chưa lưu bài viết nào</Text><Text className="mt-2 text-center text-sm text-muted">Lưu bài viết hay để xem lại sau.</Text></Card> : posts.map((post) => <View key={post.id} className="mb-3 overflow-hidden rounded-2xl border border-line bg-white">
        <Pressable onPress={() => router.push(`/community/${post.id}` as never)} className="p-4"><View className="flex-row items-center"><CommunityAvatar uri={post.author?.avatarUrl} name={post.author?.displayName} size={40} /><View className="ml-3"><Text weight="bold" className="text-sm">{post.author?.displayName ?? 'Thành viên'}</Text><Text className="mt-0.5 text-xs text-muted">{post.category.replaceAll('_', ' ')}</Text></View></View>{post.title ? <Text weight="bold" className="mt-3">{post.title}</Text> : null}<Text numberOfLines={4} className="mt-1 text-sm leading-5">{post.body}</Text>{post.imageUrls?.[0] ? <CommunityImage uri={post.imageUrls[0]} className="mt-3 h-48 w-full rounded-xl" /> : null}</Pressable>
        <View className="mx-4 border-t border-line" /><View className="flex-row items-center px-4 py-2"><Pressable onPress={() => router.push(`/community/${post.id}` as never)} className="min-h-10 flex-row items-center gap-1.5"><Heart size={16} color={colors.muted} /><Text className="text-xs text-muted">{Object.values(post.reactionCounts ?? {}).reduce((a, b) => a + b, 0)}</Text></Pressable><Pressable onPress={() => router.push(`/community/${post.id}` as never)} className="ml-5 min-h-10 flex-row items-center gap-1.5"><MessageCircle size={16} color={colors.muted} /><Text className="text-xs text-muted">{post.commentCount}</Text></Pressable><Pressable onPress={() => void remove(post.id)} className="ml-auto h-10 w-11 items-center justify-center" accessibilityLabel="Bỏ lưu bài viết"><Bookmark size={18} color={colors.accent} fill={colors.accent} /></Pressable></View>
      </View>)}
      {query.isFetchingNextPage ? <View className="py-4"><ActivityIndicator color={colors.accent} /></View> : null}
      {query.hasNextPage ? <Button label="Tải thêm" disabled={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} /> : null}
    </ScrollView>
  </View>;
}
