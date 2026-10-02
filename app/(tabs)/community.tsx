import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Plus, ThumbsUp } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { useAuth } from '@/src/features/auth/auth-provider';
import { ApiError } from '@/src/lib/api-client';
import { colors } from '@/src/theme';

import { communityApi, type PostCategory, type PostResponse } from '@/src/features/community/api';

const MOCK_FEED: PostResponse[] = [
  {
    id: 'mock-post-1',
    authorId: 'mock',
    category: 'DISCUSSION',
    title: 'Tip Writing Task 2',
    body: 'Luôn paraphrase đề bài ở câu mở đầu và nêu rõ quan điểm trước khi vào thân bài.',
    status: 'PUBLISHED',
    reactions: { LIKE: 12 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-post-2',
    authorId: 'mock',
    category: 'QUESTION',
    title: 'Listening Section 3',
    body: 'Mọi người có mẹo nào để bắt keyword khi hội thoại nhiều người không?',
    status: 'PUBLISHED',
    reactions: { LIKE: 5 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function categoryLabel(category: PostCategory) {
  if (category === 'QUESTION') return 'Hỏi đáp';
  if (category === 'DISCUSSION') return 'Thảo luận';
  return 'Chung';
}

export default function CommunityScreen() {
  const { authEnabled, status } = useAuth();
  const queryClient = useQueryClient();
  const canFetch = authEnabled && status === 'authenticated';

  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<PostCategory>('DISCUSSION');

  const feedQuery = useQuery({
    queryKey: ['community', 'posts'],
    queryFn: () => communityApi.listPosts(0, 20),
    enabled: canFetch,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: communityApi.createPost,
    onSuccess: async () => {
      setComposerOpen(false);
      setTitle('');
      setBody('');
      await queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
    },
  });

  const reactMutation = useMutation({
    mutationFn: (postId: string) => communityApi.react(postId, 'LIKE'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
    },
  });

  const livePosts = feedQuery.data?.content ?? [];
  const usingMock = !canFetch || Boolean(feedQuery.error);
  const posts = usingMock ? MOCK_FEED : livePosts;
  const errorMessage =
    feedQuery.error instanceof ApiError
      ? feedQuery.error.message
      : feedQuery.error
        ? 'Không tải được bảng tin.'
        : null;

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-28 pt-5"
        refreshControl={
          canFetch ? (
            <RefreshControl
              refreshing={feedQuery.isRefetching}
              onRefresh={() => void feedQuery.refetch()}
              tintColor={colors.accent}
            />
          ) : undefined
        }>
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text weight="black" className="text-2xl" style={{ letterSpacing: -0.5 }}>
              Bảng tin
            </Text>
            <Text className="mt-1 text-sm text-muted">
              {usingMock ? 'Mock demo — bật auth + community-service để xem dữ liệu thật' : 'Bài đăng từ cộng đồng'}
            </Text>
          </View>
          {canFetch ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tạo bài đăng"
              onPress={() => setComposerOpen(true)}
              className="h-11 w-11 items-center justify-center rounded-full bg-accent">
              <Plus size={22} color="#fff" />
            </Pressable>
          ) : null}
        </View>

        {usingMock && errorMessage ? (
          <View className="mb-3">
            <FormAlert tone="error" message={errorMessage} />
          </View>
        ) : null}

        {canFetch && feedQuery.isPending ? (
          <View className="items-center py-16">
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="mb-3">
              <View className="flex-row items-center justify-between">
                <View className="rounded-full bg-accent-soft px-2.5 py-1">
                  <Text weight="bold" className="text-[11px] text-accent-deep">
                    {categoryLabel(post.category)}
                  </Text>
                </View>
                <Text className="text-[11px] text-muted">
                  {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                </Text>
              </View>
              {post.title ? (
                <Text weight="extrabold" className="mt-2 text-base text-ink">
                  {post.title}
                </Text>
              ) : null}
              <Text className="mt-1.5 text-sm leading-5 text-muted">{post.body}</Text>
              <View className="mt-3 flex-row items-center gap-4">
                <Pressable
                  accessibilityRole="button"
                  disabled={!canFetch || usingMock || reactMutation.isPending}
                  onPress={() => reactMutation.mutate(post.id)}
                  className="flex-row items-center gap-1.5">
                  <ThumbsUp size={16} color={colors.accent} />
                  <Text weight="bold" className="text-xs text-accent">
                    {post.reactions?.LIKE ?? 0}
                  </Text>
                </Pressable>
                <View className="flex-row items-center gap-1.5">
                  <MessageCircle size={16} color={colors.muted} />
                  <Text weight="bold" className="text-xs text-muted">
                    Bình luận
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <Modal visible={composerOpen} animationType="slide" transparent onRequestClose={() => setComposerOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-surface px-5 pb-10 pt-5">
            <Text weight="black" className="text-xl">
              Bài đăng mới
            </Text>
            <View className="mt-3 flex-row gap-2">
              {(['DISCUSSION', 'QUESTION', 'GENERAL'] as PostCategory[]).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  className="rounded-full px-3 py-1.5"
                  style={{
                    backgroundColor: category === item ? colors.accentSoft : colors.line,
                  }}>
                  <Text
                    weight="bold"
                    className="text-xs"
                    style={{ color: category === item ? colors.accentDeep : colors.muted }}>
                    {categoryLabel(item)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Tiêu đề (tuỳ chọn)"
              placeholderTextColor={colors.muted}
              className="mt-4 rounded-2xl border border-line bg-canvas px-4 py-3 text-ink"
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Nội dung chia sẻ…"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              className="mt-3 min-h-[120px] rounded-2xl border border-line bg-canvas px-4 py-3 text-ink"
            />
            {createMutation.error ? (
              <View className="mt-3">
                <FormAlert
                  tone="error"
                  message={
                    createMutation.error instanceof ApiError
                      ? createMutation.error.message
                      : 'Không đăng được bài.'
                  }
                />
              </View>
            ) : null}
            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <Button label="Huỷ" variant="secondary" onPress={() => setComposerOpen(false)} />
              </View>
              <View className="flex-1">
                <Button
                  label="Đăng"
                  loading={createMutation.isPending}
                  disabled={!body.trim()}
                  onPress={() =>
                    createMutation.mutate({
                      category,
                      title: title.trim() || undefined,
                      body: body.trim(),
                    })
                  }
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
