import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { communityApi, type CommunityPost, type CursorPage, type PublicProfile } from '@/src/features/community/api';
import { CommunityAvatar, CommunityImage } from '@/src/features/community/components/community-image';
import { colors } from '@/src/theme';
import { useState } from 'react';

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>(); const router = useRouter(); const qc = useQueryClient(); const current = useCurrentUser();
  const [tab, setTab] = useState<'posts' | 'followers' | 'following'>('posts'); const [busy, setBusy] = useState(false);
  const profile = useQuery({ queryKey: ['community', 'profile', userId], queryFn: () => communityApi.profile(userId) });
  const relation = useQuery({ queryKey: ['community', 'relationship', userId], queryFn: () => communityApi.relationship(userId) });
  const list = useInfiniteQuery<CursorPage<CommunityPost | PublicProfile>>({ queryKey: ['community', 'profile-list', userId, tab], initialPageParam: undefined as string | undefined, queryFn: async ({ pageParam }) => tab === 'posts' ? communityApi.userPosts(userId, pageParam as string | undefined) : communityApi[tab](userId, pageParam as string | undefined), getNextPageParam: (page) => page.hasNext ? page.nextCursor ?? undefined : undefined });
  const entries = list.data?.pages.flatMap((page) => page.content) ?? []; const own = current.data?.id === userId;
  const toggleFollow = async () => { setBusy(true); try { await communityApi.follow(userId, Boolean(relation.data?.following)); await Promise.all([relation.refetch(), qc.invalidateQueries({ queryKey: ['community', 'feed'] })]); } catch (error) { Alert.alert('Không thể cập nhật theo dõi', error instanceof Error ? error.message : 'Vui lòng thử lại.'); } finally { setBusy(false); } };
  const refresh = () => { void Promise.all([profile.refetch(), relation.refetch(), list.refetch()]); };
  if (profile.isPending) return <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.accent} /></View>;
  if (!profile.data) return <View className="flex-1 justify-center px-5"><Text>Không tải được hồ sơ.</Text><View className="mt-3"><Button label="Thử lại" onPress={() => void profile.refetch()} /></View></View>;
  const p = profile.data;
  return <View className="flex-1 bg-canvas"><View className="px-4 pb-3 pt-4"><Pressable onPress={() => router.back()} className="min-h-11 justify-center"><Text weight="semibold" className="text-accent">‹  Cộng đồng</Text></Pressable><Text weight="black" className="mt-1 text-xl">Hồ sơ</Text></View>
    <ScrollView contentContainerClassName="px-4 pb-10" refreshControl={<RefreshControl refreshing={profile.isRefetching || list.isRefetching} onRefresh={refresh} tintColor={colors.accent} />}>
      <Card className="items-center rounded-3xl border-b-0 bg-white p-6"><CommunityAvatar uri={p.avatarUrl} name={p.displayName} size={84} /><Text weight="black" className="mt-3 text-xl">{p.displayName}</Text>{p.bio ? <Text className="mt-2 text-center text-sm leading-5 text-muted">{p.bio}</Text> : null}
        <View className="mt-3 flex-row flex-wrap justify-center gap-2">{p.targetBand != null ? <Text className="rounded-full bg-blue-50 px-3 py-1 text-xs text-accent">Mục tiêu IELTS {p.targetBand}</Text> : null}{p.streak != null ? <Text className="rounded-full bg-orange-50 px-3 py-1 text-xs text-orange-700">{p.streak} ngày học liên tục</Text> : null}</View>
        <View className="mt-4 flex-row gap-8"><Pressable onPress={() => setTab('followers')}><Text className="text-sm"><Text weight="bold">{relation.data?.followerCount ?? 0}</Text> người theo dõi</Text></Pressable><Pressable onPress={() => setTab('following')}><Text className="text-sm"><Text weight="bold">{relation.data?.followingCount ?? 0}</Text> đang theo dõi</Text></Pressable></View>
        {!own ? <Pressable disabled={busy} onPress={() => void toggleFollow()} className="mt-4 min-h-11 min-w-36 items-center justify-center rounded-full bg-accent px-6"><Text weight="bold" className="text-sm text-white">{relation.data?.following ? 'Đang theo dõi' : 'Theo dõi'}</Text></Pressable> : null}
      </Card>
      <View className="my-5 flex-row rounded-2xl bg-[#edf2fa] p-1.5">{(['posts', 'followers', 'following'] as const).map((key) => <Pressable key={key} onPress={() => setTab(key)} className="flex-1 items-center rounded-xl py-3" style={{ backgroundColor: tab === key ? 'white' : 'transparent' }}><Text weight="bold" className="text-xs" style={{ color: tab === key ? colors.accent : colors.muted }}>{key === 'posts' ? 'Bài viết' : key === 'followers' ? 'Người theo dõi' : 'Đang theo dõi'}</Text></Pressable>)}</View>
      {list.isPending ? <ActivityIndicator color={colors.accent} /> : list.isError ? <Card className="rounded-3xl border-b-0 bg-white p-5"><Text>Không tải được danh sách.</Text><View className="mt-3"><Button label="Thử lại" onPress={() => void list.refetch()} /></View></Card> : entries.length === 0 ? <Card className="rounded-3xl border-b-0 bg-white p-5"><Text className="text-center text-sm text-muted">Chưa có nội dung.</Text></Card> : entries.map((item: CommunityPost | { id: string; displayName: string; avatarUrl?: string | null }) => <Card key={item.id} className="mb-3">{'body' in item ? <Pressable onPress={() => router.push(`/community/${item.id}` as never)}><View className="flex-row items-center"><CommunityAvatar name={p.displayName} size={36} /><Text weight="bold" className="ml-2 text-sm">{p.displayName}</Text><Text className="ml-2 text-xs text-muted">{item.category}</Text></View>{item.title ? <Text weight="bold" className="mt-3">{item.title}</Text> : null}<Text numberOfLines={4} className="mt-1 text-sm leading-5">{item.body}</Text>{item.imageUrls?.length ? <CommunityImage uri={item.imageUrls[0]} className="mt-3 h-48 w-full rounded-xl" /> : null}</Pressable> : <View className="flex-row items-center"><CommunityAvatar uri={item.avatarUrl} name={item.displayName} size={42} /><Text weight="bold" className="ml-3 flex-1">{item.displayName}</Text></View>}</Card>)}
      {list.hasNextPage ? <Button label={list.isFetchingNextPage ? 'Đang tải…' : 'Tải thêm'} disabled={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()} /> : null}
    </ScrollView>
  </View>;
}
