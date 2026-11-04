import { useInfiniteQuery } from '@tanstack/react-query';
import { MoreHorizontal } from 'lucide-react-native';
import { memo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { communityApi, parseMentionMarkup, type Comment } from '../api';
import { timeAgo } from '../format';
import { CommunityAvatar } from './community-image';

type CommentItemProps = {
  comment: Comment;
  nested?: boolean;
  highlighted?: boolean;
  onReply: (comment: Comment) => void;
  onMenu: (comment: Comment) => void;
  onProfile: (userId: string) => void;
};

/** One comment bubble. Top-level comments own a collapsible thread of replies. */
export const CommentItem = memo(function CommentItem({ comment, nested = false, highlighted = false, onReply, onMenu, onProfile }: CommentItemProps) {
  const [open, setOpen] = useState(false);
  const replies = useInfiniteQuery({
    queryKey: ['community', 'replies', comment.id],
    queryFn: ({ pageParam }) => communityApi.replies(comment.id, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    enabled: open && !nested,
  });
  const replyRows = replies.data?.pages.flatMap((page) => page.content) ?? [];
  const name = comment.author?.displayName ?? 'Thành viên';

  return (
    <View className={nested ? 'mt-3' : 'px-4 pt-4'}>
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
          <View className="flex-row items-center pl-1">
            {comment.createdAt ? <Text className="text-xs text-muted">{timeAgo(comment.createdAt)}</Text> : null}
            <Pressable onPress={() => onReply(comment)} accessibilityRole="button" accessibilityLabel={`Trả lời ${name}`} className="min-h-11 justify-center px-3">
              <Text weight="bold" className="text-xs text-muted">Trả lời</Text>
            </Pressable>
            <Pressable onPress={() => onMenu(comment)} accessibilityRole="button" accessibilityLabel="Tùy chọn bình luận" className="h-11 w-11 items-center justify-center">
              <MoreHorizontal size={17} color={colors.muted} />
            </Pressable>
          </View>

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
                    <CommentItem key={reply.id} nested comment={reply} onReply={() => onReply({ ...reply, parentCommentId: comment.id })} onMenu={onMenu} onProfile={onProfile} />
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
