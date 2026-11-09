import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { communityApi, type Comment, type OffsetPage, type ReactionType } from './api';

type CommentPages = InfiniteData<OffsetPage<Comment>>;
const inFlight = new Set<string>();

export function applyCommentReaction(comment: Comment, type: ReactionType): Comment {
  const reactionCounts = {
    LIKE: comment.reactionCounts?.LIKE ?? 0,
    LOVE: comment.reactionCounts?.LOVE ?? 0,
    HELPFUL: comment.reactionCounts?.HELPFUL ?? 0,
    ACCURATE: comment.reactionCounts?.ACCURATE ?? 0,
  };
  if (comment.myReaction) reactionCounts[comment.myReaction] = Math.max(0, reactionCounts[comment.myReaction] - 1);
  const myReaction = comment.myReaction === type ? null : type;
  if (myReaction) reactionCounts[myReaction] += 1;
  return { ...comment, reactionCounts, myReaction };
}

/** PUT replaces the prior reaction; DELETE is needed only when toggling it off. */
export async function reactToComment(client: QueryClient, postId: string, comment: Comment, type: ReactionType) {
  if (inFlight.has(comment.id)) return;
  inFlight.add(comment.id);
  const queryKey = comment.parentCommentId
    ? ['community', 'replies', comment.parentCommentId]
    : ['community', 'comments', postId];
  let original = comment;
  const update = (change: (row: Comment) => Comment) => client.setQueryData<CommentPages>(queryKey, (data) => data ? {
    ...data,
    pages: data.pages.map((page) => ({ ...page, content: page.content.map((row) => row.id === comment.id ? change(row) : row) })),
  } : data);

  try {
    await client.cancelQueries({ queryKey, exact: true });
    original = client.getQueryData<CommentPages>(queryKey)?.pages.flatMap((page) => page.content).find((row) => row.id === comment.id) ?? comment;
    update((row) => applyCommentReaction(row, type));
    try {
      await (original.myReaction === type
        ? communityApi.removeCommentReaction(comment.id, type)
        : communityApi.reactToComment(comment.id, type));
    } catch (error) {
      // Preserve concurrent edits/reply counts; restore only this mutation's fields.
      update((row) => ({ ...row, reactionCounts: original.reactionCounts, myReaction: original.myReaction }));
      throw error;
    } finally {
      await client.invalidateQueries({ queryKey, exact: true });
    }
  } finally {
    inFlight.delete(comment.id);
  }
}
