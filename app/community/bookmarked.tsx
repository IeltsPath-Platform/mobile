import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Bookmark, Heart, MessageCircle } from 'lucide-react-native';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { communityApi, type CommunityPost } from '@/src/features/community/api';
import { CommunityAvatar, CommunityImage } from '@/src/features/community/components/community-image';
import { colors } from '@/src/theme';

export default function BookmarkedScreen() {
  const router = useRouter(); const qc = useQueryClient();
  const query = useInfiniteQuery({ queryKey: ['community', 'bookmarks'], initialPageParam: undefined as string | undefined, queryFn: ({ pageParam }) => communityApi.bookmarks(pageParam), getNextPageParam: (page) => page.hasNext ? page.nextCursor ?? undefined : undefined });
  const seen = new Set<string>();
  const posts = (query.data?.pages.flatMap((page) => page.content) ?? []).filter((post) => { if (seen.has(post.id)) return false; seen.add(post.id); return true; });
  const refresh = useCallback(() => { void query.refetch(); }, [query.refetch]);
  const remove = useCallback(async (id: string) => {
    try { await communityApi.bookmark(id, true); await Promise.all([qc.invalidateQueries({ queryKey: ['community', 'bookmarks'] }), qc.invalidateQueries({ queryKey: ['community', 'feed'] }), qc.invalidateQueries({ queryKey: ['community', 'detail', id] })]); }
    catch (error) { Alert.alert('Không thể bỏ lưu', error instanceof Error ? error.message : 'Vui lòng thử lại.'); }
  }, [qc]);
  const empty = query.isPending ? <View className="py-12"><ActivityIndicator color={colors.accent} /></View> : query.isError ? <Card className="rounded-3xl border-b-0 bg-surface p-5"><Text>Không tải được bài viết đã lưu.</Text><View className="mt-3"><Button label="Thử lại" onPress={refresh} /></View></Card> : <Card className="items-center rounded-3xl border-b-0 bg-surface p-7"><Bookmark size={26} color={colors.accent} /><Text weight="bold" className="mt-3 text-center">Bạn chưa lưu bài viết nào</Text><Text className="mt-2 text-center text-sm text-muted">Lưu bài viết hay để xem lại sau.</Text></Card>;
  return <View className="flex-1 bg-canvas"><View className="border-b border-line bg-surface px-4 pb-3 pt-4"><Pressable onPress={() => router.back()} className="min-h-10 justify-center"><Text weight="semibold" className="text-accent">‹  Cộng đồng</Text></Pressable><Text weight="black" className="mt-1 text-2xl">Bài viết đã lưu</Text></View>
    <FlatList
      className="flex-1" contentContainerClassName="grow px-4 pb-10 pt-4" data={posts} keyExtractor={(post) => post.id} ListEmptyComponent={empty}
      renderItem={({ item: post }) => <SavedPost post={post} onOpen={() => router.push(`/community/${post.id}` as never)} onRemove={() => void remove(post.id)} />}
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator className="py-4" color={colors.accent} /> : null}
      onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }} onEndReachedThreshold={0.4}
      initialNumToRender={8} maxToRenderPerBatch={6} windowSize={7}
      refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={refresh} tintColor={colors.accent} />}
    />
  </View>;
}

const SavedPost = function SavedPost({ post, onOpen, onRemove }: { post: CommunityPost; onOpen: () => void; onRemove: () => void }) {
  const reactionCount = Object.values(post.reactionCounts ?? {}).reduce((sum, count) => sum + count, 0);
  return <View className="mb-4 overflow-hidden rounded-3xl border border-line bg-surface">
    <Pressable onPress={onOpen} className="p-4"><View className="flex-row items-center"><CommunityAvatar uri={post.author?.avatarUrl} name={post.author?.displayName} size={40} /><View className="ml-3"><Text weight="bold" className="text-sm">{post.author?.displayName ?? 'Thành viên'}</Text><Text className="mt-0.5 text-xs text-muted">{post.category.replaceAll('_', ' ')}</Text></View></View>{post.title ? <Text weight="bold" className="mt-3">{post.title}</Text> : null}<Text numberOfLines={4} className="mt-1 text-sm leading-5">{post.body}</Text>{post.imageUrls?.[0] ? <CommunityImage uri={post.imageUrls[0]} className="mt-3 h-48 w-full rounded-xl" /> : null}</Pressable>
    <View className="mx-4 border-t border-line" /><View className="flex-row items-center px-4 py-2"><Pressable onPress={onOpen} className="min-h-10 flex-row items-center gap-1.5"><Heart size={16} color={colors.muted} /><Text className="text-xs text-muted">{reactionCount}</Text></Pressable><Pressable onPress={onOpen} className="ml-5 min-h-10 flex-row items-center gap-1.5"><MessageCircle size={16} color={colors.muted} /><Text className="text-xs text-muted">{post.commentCount}</Text></Pressable><Pressable onPress={onRemove} className="ml-auto h-10 w-11 items-center justify-center" accessibilityLabel="Bỏ lưu bài viết"><Bookmark size={18} color={colors.accent} fill={colors.accent} /></Pressable></View>
  </View>;
};
