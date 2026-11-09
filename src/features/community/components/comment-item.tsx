import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal } from 'lucide-react-native';
import { memo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { communityApi, parseMentionMarkup, type Comment, type ReactionType } from '../api';
import { reactToComment } from '../comment-reactions';
import { timeAgo, totalReactions } from '../format';
import { ApiError } from '@/src/lib/api-client';
import { haptics } from '@/src/lib/haptics';
import { CommunityAvatar } from './community-image';
import { CommunityReactionControl } from './community-reaction-control';

type CommentItemProps = {
  comment: Comment;
  postId: string;
  nested?: boolean;
  highlighted?: boolean;
  onReply: (comment: Comment) => void;
  onMenu: (comment: Comment) => void;
  onProfile: (userId: string) => void;
};

/** One comment bubble. Top-level comments own a collapsible thread of replies. */
export const CommentItem = memo(function CommentItem({ comment, postId, nested = false, highlighted = false, onReply, onMenu, onProfile }: CommentItemProps) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [reactionError, setReactionError] = useState('');
  const reactionPending = useRef(false);
  const replies = useInfiniteQuery({
    queryKey: ['community', 'replies', comment.id],
    queryFn: ({ pageParam }) => communityApi.replies(comment.id, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    enabled: open && !nested,
  });
  const replyRows = replies.data?.pages.flatMap((page) => page.content) ?? [];
  const name = comment.author?.displayName ?? 'Thành viên';
  const react = async (type: ReactionType) => {
    if (reactionPending.current) return;
    reactionPending.current = true;
    setReacting(true);
    setReactionError('');
    try {
      await reactToComment(client, postId, comment, type);
    } catch (error) {
      haptics.error();
      setReactionError(error instanceof ApiError && error.status === 404
        ? 'Bình luận không còn hiển thị. Hãy tải lại bài viết.'
        : error instanceof ApiError && error.status === 401
          ? 'Đăng nhập lại để thả cảm xúc.'
          : error instanceof Error ? error.message : 'Chưa lưu được cảm xúc. Hãy thử lại.');
    } finally {
      reactionPending.current = false;
      setReacting(false);
    }
  };

  return (
    <View className={nested ? 'mt-3' : 'px-4 pt-4'} style={{ zIndex: trayOpen ? 30 : 0 }}>
      <View className="flex-row">
        <Pressable onPress={() => onProfile(comment.authorId)} accessibilityRole="button" accessibilityLabel={`Hồ sơ ${name}`} hitSlop={4}>
          <CommunityAvatar uri={comment.author?.avatarUrl} name={comment.author?.displayName} size={nested ? 30 : 36} />
        </Pressable>
        <View className="ml-2.5 flex-1">
          <Pressable
            onLongPress={() => onMenu(comment)}
            delayLongPress={350}
            accessibilityRole="text"
            accessibilityHint="Nhấn giữ để xem thêm tùy chọn"
            className="self-start rounded-2xl px-3.5 py-2.5"
            style={{ backgroundColor: highlighted ? colors.accentSoft : colors.surfaceTint, borderWidth: highlighted ? 1 : 0, borderColor: colors.accent, maxWidth: '100%' }}>
            <Text weight="bold" className="text-[13px]" onPress={() => onProfile(comment.authorId)}>{name}</Text>
            <Text className="mt-0.5 text-[15px] leading-[22px]">
              {parseMentionMarkup(comment.body).map((part, index) => part.userId
                ? <Text key={index} weight="semibold" accessibilityRole="link" style={{ color: colors.accentDeep }} onPress={() => onProfile(part.userId!)}>{part.text}</Text>
                : <Text key={index}>{part.text}</Text>)}
            </Text>
          </Pressable>
          <View className="flex-row flex-wrap items-center pl-1">
            <CommunityReactionControl compact count={totalReactions(comment.reactionCounts)} selected={comment.myReaction} disabled={reacting} onSelect={(type) => void react(type)} trayOffset={nested ? -64 : -20} onOpenChange={setTrayOpen} />
            <Pressable onPress={() => onReply(comment)} accessibilityRole="button" accessibilityLabel={`Trả lời ${name}`} className="min-h-11 justify-center px-3">
              <Text weight="bold" className="text-xs text-muted">Trả lời</Text>
            </Pressable>
            <Pressable onPress={() => onMenu(comment)} accessibilityRole="button" accessibilityLabel="Tùy chọn bình luận" className="h-11 w-11 items-center justify-center">
              <MoreHorizontal size={17} color={colors.muted} />
            </Pressable>
            {comment.createdAt ? <Text className="text-xs text-muted">{timeAgo(comment.createdAt)}</Text> : null}
          </View>
          {reacting ? <Text accessibilityLiveRegion="polite" className="text-xs text-muted">Đang lưu cảm xúc…</Text> : null}
          {reactionError ? <Text accessibilityRole="alert" className="mb-2 text-xs text-danger">{reactionError}</Text> : null}

          {!nested && comment.replyCount > 0 ? (
            <View>
              <Pressable onPress={() => setOpen((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: open }} className="min-h-11 flex-row items-center gap-2 self-start">
                <View className="h-px w-6 bg-line" />
                <Text weight="bold" className="text-xs text-accent-deep">{open ? 'Ẩn phản hồi' : `Xem ${comment.replyCount} phản hồi`}</Text>
              </Pressable>
              {open ? (
                <View className="border-l border-line pl-3">
                  {replies.isPending ? <ActivityIndicator className="my-3 self-start" color={colors.accent} /> : null}
                  {replies.isError ? (
                    <Pressable onPress={() => void replies.refetch()} className="min-h-11 justify-center"><Text className="text-xs" style={{ color: colors.danger }}>Không tải được phản hồi · Thử lại</Text></Pressable>
                  ) : null}
                  {replyRows.map((reply) => (
                    <CommentItem key={reply.id} postId={postId} nested comment={reply} onReply={() => onReply({ ...reply, parentCommentId: comment.id })} onMenu={onMenu} onProfile={onProfile} />
                  ))}
                  {replies.hasNextPage ? (
                    <Pressable accessibilityRole="button" onPress={() => void replies.fetchNextPage()} className="min-h-11 justify-center">
                      <Text weight="bold" className="text-xs text-accent-deep">{replies.isFetchingNextPage ? 'Đang tải…' : 'Tải thêm phản hồi'}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
});
