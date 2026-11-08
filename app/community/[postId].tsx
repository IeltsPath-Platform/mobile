import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bookmark, Flag, MessageCircle, MoreHorizontal, Pencil, Play, Send, Trash2, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, RefreshControl, TextInput, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet, type ActionSheetItem } from '@/src/components/ui/action-sheet';
import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Text } from '@/src/components/ui/text';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { communityApi, insertMention, type Comment, type ReactionType } from '@/src/features/community/api';
import { communityCategoryColor } from '@/src/features/community/community-colors';
import { CommentItem } from '@/src/features/community/components/comment-item';
import { CommunityAvatar, CommunityImage } from '@/src/features/community/components/community-image';
import { CommunityPostContent } from '@/src/features/community/components/community-post-content';
import { CommunityReactionControl } from '@/src/features/community/components/community-reaction-control';
import { usePostMenu } from '@/src/features/community/components/post-menu';
import { CATEGORY_LABELS, totalReactions } from '@/src/features/community/format';
import { REPORT_REASONS, reactToPost, reportContent, toggleBookmark, toggleFollowAuthor } from '@/src/features/community/post-actions';
import { updateCommunityPostCache } from '@/src/features/community/post-cache';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

export default function PostDetailScreen() {
  const { postId, commentId: rawCommentId } = useLocalSearchParams<{ postId: string; commentId?: string | string[] }>();
  const targetCommentId = (Array.isArray(rawCommentId) ? rawCommentId[0] : rawCommentId) || undefined;
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const user = useCurrentUser();

  const listRef = useRef<FlatList<Comment>>(null);
  const headerHeight = useRef(0);
  const jumped = useRef(false);

  const post = useQuery({ queryKey: ['community', 'detail', postId], queryFn: () => communityApi.post(postId), enabled: Boolean(postId) });
  const comments = useInfiniteQuery({
    queryKey: ['community', 'comments', postId],
    queryFn: ({ pageParam }) => communityApi.comments(postId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    enabled: Boolean(postId),
  });
  const rows = useMemo(() => comments.data?.pages.flatMap((page) => page.content) ?? [], [comments.data]);

  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<Comment>();
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<{ id: string; displayName: string }[]>([]);
  const [editing, setEditing] = useState<Comment>();
  const [editDraft, setEditDraft] = useState('');
  const [commentMenu, setCommentMenu] = useState<Comment | null>(null);
  const [reportingComment, setReportingComment] = useState<Comment | null>(null);
  const mentionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mentionSequence = useRef(0);
  const inputRef = useRef<TextInputInstance>(null);
  useEffect(() => () => { clearTimeout(mentionTimer.current); mentionSequence.current++; }, []);

  const postMenu = usePostMenu(user.data?.id, () => router.replace('/(tabs)/community' as never));

  // Deep link from a notification: load pages until the comment exists, then scroll to it once.
  useEffect(() => {
    if (!targetCommentId || jumped.current || comments.isFetchingNextPage) return;
    const index = rows.findIndex((row) => row.id === targetCommentId);
    if (index >= 0) {
      jumped.current = true;
      setTimeout(() => listRef.current?.scrollToIndex({ index, viewOffset: 12, animated: true }), 250);
    } else if (comments.hasNextPage) {
      void comments.fetchNextPage();
    }
  }, [targetCommentId, rows, comments.hasNextPage, comments.isFetchingNextPage, comments.fetchNextPage]);

  const scrollToComments = () => listRef.current?.scrollToOffset({ offset: Math.max(headerHeight.current - 8, 0), animated: true });

  const sync = async (replyParentId?: string, commentCountDelta = 0) => {
    if (commentCountDelta) updateCommunityPostCache(qc, postId, (cached) => ({ ...cached, commentCount: Math.max(0, cached.commentCount + commentCountDelta) }));
    const requests: Promise<unknown>[] = [comments.refetch()];
    if (replyParentId) requests.push(qc.invalidateQueries({ queryKey: ['community', 'replies', replyParentId] }));
    await Promise.all(requests);
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const parentId = replyTo?.parentCommentId ?? replyTo?.id;
      await communityApi.comment(postId, body, parentId);
      setDraft('');
      setReplyTo(undefined);
      setSuggestions([]);
      haptics.success();
      await sync(parentId, 1);
    } catch (error) {
      haptics.error();
      Alert.alert('Không gửi được bình luận', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  const saveEdit = async () => {
    if (!editing || !editDraft.trim()) return;
    try {
      await communityApi.updateComment(editing.id, editDraft.trim());
      setEditing(undefined);
      setEditDraft('');
      await sync(editing.parentCommentId ?? undefined);
    } catch (error) {
      haptics.error();
      Alert.alert('Không thể sửa bình luận', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    }
  };

  const removeComment = (comment: Comment) => Alert.alert('Xóa bình luận?', 'Bình luận này sẽ bị xóa vĩnh viễn.', [
    { text: 'Hủy', style: 'cancel' },
    {
      text: 'Xóa',
      style: 'destructive',
      onPress: () => void communityApi.deleteComment(comment.id)
        .then(() => sync(comment.parentCommentId ?? undefined, -1))
        .catch((error) => Alert.alert('Không thể xóa', error instanceof Error ? error.message : 'Vui lòng thử lại.')),
    },
  ]);

  const startReply = useCallback((comment: Comment) => {
    setReplyTo(comment);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);
  const openProfile = useCallback((id: string) => router.push(`/community/users/${id}` as never), [router]);

  const onDraftChange = (value: string) => {
    setDraft(value);
    clearTimeout(mentionTimer.current);
    const sequence = ++mentionSequence.current;
    const match = value.match(/@([^\s@]*)$/u);
    if (match && match[1].length >= 2) {
      const term = match[1];
      mentionTimer.current = setTimeout(() => {
        void communityApi.mentionSuggestions(term)
          .then((found) => { if (sequence === mentionSequence.current) setSuggestions(found.slice(0, 5)); })
          .catch(() => { if (sequence === mentionSequence.current) setSuggestions([]); });
      }, 250);
    } else {
      setSuggestions([]);
    }
  };

  const commentMenuItems = (): ActionSheetItem[] => {
    const comment = commentMenu;
    if (!comment) return [];
    const mine = comment.myComment || comment.authorId === user.data?.id;
    if (mine) {
      return [
        { label: 'Sửa bình luận', icon: Pencil, onPress: () => { setEditing(comment); setEditDraft(comment.body); } },
        { label: 'Xóa bình luận', icon: Trash2, destructive: true, onPress: () => removeComment(comment) },
      ];
    }
    return [{ label: 'Báo cáo bình luận', icon: Flag, destructive: true, onPress: () => { setTimeout(() => setReportingComment(comment), 280); } }];
  };

  if (post.isPending) {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Bài viết" fallbackHref="/(tabs)/community" />
        <View className="px-4 pt-4" accessibilityLabel="Đang tải bài viết" accessibilityRole="progressbar">
          <View className="flex-row items-center">
            <Skeleton width={46} height={46} radius={23} />
            <View className="ml-3 gap-2"><Skeleton width={140} height={13} /><Skeleton width={90} height={10} /></View>
          </View>
          <View className="mt-5 gap-2"><Skeleton height={14} /><Skeleton height={14} width="92%" /><Skeleton height={14} width="64%" /></View>
          <Skeleton height={220} radius={16} style={{ marginTop: 16 }} />
        </View>
      </View>
    );
  }
  if (post.isError || !post.data) {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Bài viết" fallbackHref="/(tabs)/community" />
        <View className="px-5 pt-8">
          <Text weight="bold">Không tải được bài viết.</Text>
          <Text className="mt-1 text-sm text-muted">{post.error instanceof Error ? post.error.message : 'Bài viết có thể đã bị xóa hoặc bạn đang mất kết nối.'}</Text>
          <View className="mt-4"><Button label="Thử lại" onPress={() => void post.refetch()} /></View>
        </View>
      </View>
    );
  }

  const item = post.data;
  const own = item.authorId === user.data?.id;
  const reactions = totalReactions(item.reactionCounts);
  const category = communityCategoryColor(item.category);
  const images = item.imageUrls ?? [];

  const header = (
    <View onLayout={(event) => { headerHeight.current = event.nativeEvent.layout.height; }}>
      <View className="flex-row items-center px-4 pt-4">
        <Pressable onPress={() => openProfile(item.authorId)} accessibilityRole="button" accessibilityLabel={`Hồ sơ ${item.author?.displayName ?? 'thành viên'}`}>
          <CommunityAvatar uri={item.author?.avatarUrl} name={item.author?.displayName} size={46} />
        </Pressable>
        <View className="ml-3 flex-1">
          <Pressable onPress={() => openProfile(item.authorId)}><Text weight="bold" numberOfLines={1} className="text-base">{item.author?.displayName ?? 'Thành viên'}</Text></Pressable>
          <View className="mt-0.5 flex-row items-center">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: category.foreground }} />
            <Text weight="semibold" className="ml-1.5 text-xs" style={{ color: category.foreground }}>{CATEGORY_LABELS[item.category]}</Text>
            <Text className="ml-1.5 text-xs text-muted">· {new Date(item.createdAt).toLocaleString('vi-VN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        </View>
        {!own ? (
          <Pressable
            onPress={() => { haptics.tap(); void toggleFollowAuthor(qc, item); }}
            accessibilityRole="button"
            accessibilityLabel={item.followingAuthor ? 'Bỏ theo dõi' : 'Theo dõi'}
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityState={{ selected: item.followingAuthor }}
            className="min-h-10 justify-center rounded-full border px-4 active:opacity-70"
            style={{ backgroundColor: item.followingAuthor ? 'transparent' : colors.accent, borderColor: item.followingAuthor ? colors.line : colors.accent }}>
            <Text weight="bold" className="text-xs" style={{ color: item.followingAuthor ? colors.ink : colors.onAccent }}>{item.followingAuthor ? 'Đang theo dõi' : 'Theo dõi'}</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="mt-3">
        <CommunityPostContent title={item.title} body={item.body} background={item.background} imageCount={images.length} />
      </View>

      {images.length ? (
        <View className="mt-1 gap-2 px-4">
          {images.map((url, index) => <CommunityImage key={`${url}-${index}`} preview uri={url} label={`Ảnh ${index + 1} trong bài viết`} className="h-72 w-full overflow-hidden rounded-2xl" />)}
        </View>
      ) : null}

      {item.videoUrl ? (
        <Pressable
          onPress={() => void Linking.openURL(item.videoUrl!).catch(() => Alert.alert('Không mở được video', 'Hãy thử sao chép liên kết và mở bằng trình duyệt.'))}
          accessibilityRole="link"
          className="mx-4 mt-3 min-h-12 flex-row items-center gap-3 rounded-2xl px-4 active:opacity-80"
          style={{ backgroundColor: colors.accentSoft }}>
          <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: colors.accent }}><Play size={14} color={colors.onAccent} fill={colors.onAccent} /></View>
          <Text weight="bold" className="flex-1 text-sm text-accent-deep">Xem video đính kèm</Text>
        </Pressable>
      ) : null}

      {reactions > 0 || item.commentCount > 0 ? (
        <Text className="mt-3 px-4 text-[13px] text-muted">
          {reactions > 0 ? `${reactions} cảm xúc` : ''}{reactions > 0 && item.commentCount > 0 ? ' · ' : ''}{item.commentCount > 0 ? `${item.commentCount} bình luận` : ''}
        </Text>
      ) : null}

      <View className="mt-2 flex-row items-center border-y border-line px-2">
        <CommunityReactionControl selected={item.myReaction as ReactionType | null | undefined} onSelect={(type) => void reactToPost(qc, item, type)} />
        <Pressable onPress={scrollToComments} className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-lg active:opacity-60" accessibilityRole="button" accessibilityLabel={`Đi đến ${item.commentCount} bình luận`}>
          <MessageCircle size={19} color={colors.muted} />
          <Text weight="semibold" className="text-xs text-muted">Bình luận</Text>
        </Pressable>
        <Pressable onPress={() => { haptics.tap(); void toggleBookmark(qc, item); }} className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-lg active:opacity-60" accessibilityRole="button" accessibilityLabel={item.bookmarkedByMe ? 'Bỏ lưu bài viết' : 'Lưu bài viết'} accessibilityState={{ selected: item.bookmarkedByMe }}>
          <Bookmark size={19} color={item.bookmarkedByMe ? colors.accent : colors.muted} fill={item.bookmarkedByMe ? colors.accent : 'transparent'} />
          <Text weight="semibold" className="text-xs" style={{ color: item.bookmarkedByMe ? colors.accent : colors.muted }}>{item.bookmarkedByMe ? 'Đã lưu' : 'Lưu'}</Text>
        </Pressable>
      </View>

      <Text weight="extrabold" className="px-4 pb-1 pt-5 text-base">Bình luận{item.commentCount > 0 ? ` (${item.commentCount})` : ''}</Text>
      {comments.isPending ? (
        <View className="gap-4 px-4 py-4" accessibilityLabel="Đang tải bình luận" accessibilityRole="progressbar">
          {[0, 1, 2].map((row) => (
            <View key={row} className="flex-row">
              <Skeleton width={36} height={36} radius={18} />
              <View className="ml-2.5 flex-1 gap-2"><Skeleton width={120} height={12} /><Skeleton height={12} width="80%" /></View>
            </View>
          ))}
        </View>
      ) : null}
      {comments.isError ? (
        <View className="px-4 py-3"><Button variant="secondary" label="Tải lại bình luận" onPress={() => void comments.refetch()} /></View>
      ) : null}
      {comments.isSuccess && rows.length === 0 ? (
        <View className="items-center px-8 py-10">
          <MessageCircle size={28} color={colors.muted} />
          <Text weight="bold" className="mt-3">Chưa có bình luận</Text>
          <Text className="mt-1 text-center text-sm text-muted">Hãy là người đầu tiên chia sẻ suy nghĩ của bạn.</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView className="flex-1 bg-canvas" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BackHeader
        title="Bài viết"
        fallbackHref="/(tabs)/community"
        rightAction={
          <Pressable onPress={() => postMenu.open(item)} accessibilityRole="button" accessibilityLabel="Tùy chọn bài viết" className="h-11 w-11 items-center justify-center rounded-full active:bg-tint">
            <MoreHorizontal size={22} color={colors.ink} />
          </Pressable>
        }
      />
      <FlatList<Comment>
        ref={listRef}
        data={rows}
        keyExtractor={(row) => row.id}
        renderItem={({ item: comment }) => (
          <CommentItem postId={postId} comment={comment} highlighted={comment.id === targetCommentId} onReply={startReply} onMenu={setCommentMenu} onProfile={openProfile} />
        )}
        ListHeaderComponent={header}
        ListFooterComponent={comments.hasNextPage ? (
          <View className="px-4 py-4"><Button variant="secondary" label={comments.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm bình luận'} loading={comments.isFetchingNextPage} onPress={() => void comments.fetchNextPage()} /></View>
        ) : <View className="h-6" />}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
          setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, viewOffset: 12, animated: true }), 150);
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        refreshControl={<RefreshControl refreshing={(post.isRefetching || comments.isRefetching) && !comments.isFetchingNextPage} onRefresh={() => { void post.refetch(); void comments.refetch(); }} tintColor={colors.accent} />}
      />

      <View className="border-t border-line bg-surface px-3 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
        {replyTo ? (
          <View className="mb-2 flex-row items-center rounded-xl px-3" style={{ backgroundColor: colors.accentSoft }}>
            <Text numberOfLines={1} className="min-h-9 flex-1 py-2 text-xs text-muted">Đang trả lời <Text weight="bold" className="text-xs text-ink">{replyTo.author?.displayName ?? 'thành viên'}</Text></Text>
            <Pressable onPress={() => setReplyTo(undefined)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hủy trả lời" className="h-9 w-9 items-center justify-center"><X size={16} color={colors.muted} /></Pressable>
          </View>
        ) : null}
        {suggestions.length ? (
          <View className="mb-2 overflow-hidden rounded-xl border border-line bg-surface">
            {suggestions.map((suggestion) => (
              <Pressable
                key={suggestion.id}
                accessibilityRole="button"
                className="min-h-11 justify-center px-4 active:bg-tint"
                onPress={() => {
                  setDraft((value) => {
                    const inserted = insertMention(value, suggestion);
                    if (inserted === null) { Alert.alert('Đã đạt giới hạn 5 lượt nhắc tên trong bình luận.'); return value; }
                    return inserted;
                  });
                  setSuggestions([]);
                }}>
                <Text weight="semibold">@{suggestion.displayName}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View className="flex-row items-end gap-2">
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={onDraftChange}
            placeholder={replyTo ? 'Viết câu trả lời…' : 'Viết bình luận…'}
            placeholderTextColor={colors.muted}
            multiline
            maxLength={5000}
            textAlignVertical="center"
            accessibilityLabel={replyTo ? 'Viết câu trả lời' : 'Viết bình luận'}
            className="max-h-28 min-h-11 flex-1 rounded-3xl bg-tint px-4 py-2.5 text-base text-ink"
          />
          <Pressable
            disabled={!draft.trim() || sending}
            onPress={() => void send()}
            accessibilityRole="button"
            accessibilityLabel={replyTo ? 'Gửi câu trả lời' : 'Gửi bình luận'}
            accessibilityState={{ disabled: !draft.trim() || sending, busy: sending }}
            className="h-11 w-11 items-center justify-center rounded-full active:opacity-80"
            style={{ backgroundColor: draft.trim() ? colors.accent : colors.surfaceTint }}>
            {sending ? <ActivityIndicator size="small" color={colors.onAccent} /> : <Send size={18} color={draft.trim() ? colors.onAccent : colors.muted} />}
          </Pressable>
        </View>
      </View>

      <ActionSheet visible={Boolean(commentMenu)} title="Tùy chọn bình luận" items={commentMenuItems()} onClose={() => setCommentMenu(null)} />
      <ActionSheet
        visible={Boolean(reportingComment)}
        title="Lý do báo cáo"
        items={REPORT_REASONS.map((reason) => ({ label: reason, onPress: () => { if (reportingComment) void reportContent('COMMENT', reportingComment.id, reason); } }))}
        onClose={() => setReportingComment(null)}
      />
      {postMenu.element}

      <Modal visible={Boolean(editing)} transparent animationType="fade" onRequestClose={() => setEditing(undefined)}>
        <KeyboardAvoidingView className="flex-1 justify-center bg-black/50 px-5" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="rounded-3xl bg-surface p-5">
            <Text weight="extrabold" className="text-lg">Sửa bình luận</Text>
            <TextInput
              value={editDraft}
              onChangeText={setEditDraft}
              multiline
              autoFocus
              placeholder="Nội dung bình luận"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Nội dung bình luận"
              className="mt-4 min-h-24 rounded-2xl bg-tint p-3 text-base text-ink"
              textAlignVertical="top"
            />
            <View className="mt-4 flex-row gap-3">
              <View className="flex-1"><Button label="Hủy" variant="secondary" onPress={() => setEditing(undefined)} /></View>
              <View className="flex-1"><Button label="Lưu" disabled={!editDraft.trim()} onPress={() => void saveEdit()} /></View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}
