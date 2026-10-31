import { apiRequest } from '@/src/lib/api-client';
import { imageUploadForm } from '@/src/lib/image-upload-form';

export type PostCategory = 'GENERAL' | 'QUESTION' | 'DISCUSSION' | 'WRITING_SHARING' | 'SPEAKING_PARTNER' | 'RESOURCE_TIPS';
export type PostBackground = 'VIOLET' | 'CRIMSON' | 'MIDNIGHT' | 'SUNSET' | 'OCEAN' | 'FOREST' | 'ROSE' | 'AURORA';
export type ReactionType = 'LIKE' | 'LOVE' | 'HELPFUL' | 'ACCURATE';
export type PublicProfile = { id: string; displayName: string; avatarUrl?: string | null; bio?: string | null; targetBand?: number | null; streak?: number };
export type CommunityPost = {
  id: string; authorId: string; category: PostCategory; title: string | null; body: string;
  createdAt: string; updatedAt?: string; imageUrls: string[]; videoUrl?: string | null;
  targetBand?: number | null; background?: PostBackground | null; author?: PublicProfile | null;
  reactionCounts: Record<string, number>; myReaction?: string | null; commentCount: number;
  bookmarkedByMe: boolean; followingAuthor: boolean;
};
export type CursorPage<T> = { content: T[]; nextCursor: string | null; hasNext: boolean; size: number };
export type OffsetPage<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean };
export type Comment = { id: string; authorId: string; parentCommentId: string | null; body: string; createdAt?: string; updatedAt?: string; replyCount: number; author?: PublicProfile | null; myComment?: boolean };
export type Notification = { id: string; actorId: string; actor?: PublicProfile | null; eventType: string; postId?: string | null; commentId?: string | null; createdAt: string; readAt?: string | null };
export type NotificationPreference = { eventType: string; enabled: boolean };
export type PostInput = { category: PostCategory; title?: string; body: string; imageUrls: string[]; videoUrl?: string | null; targetBand?: number | null; background?: string | null };

const query = (values: Record<string, string | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, value); });
  return params.toString();
};
const page = <T,>(value: unknown): CursorPage<T> => {
  if (Array.isArray(value)) return { content: value as T[], nextCursor: null, hasNext: false, size: value.length };
  const result = (value ?? {}) as Partial<CursorPage<T>>;
  return { content: Array.isArray(result.content) ? result.content : [], nextCursor: result.nextCursor ?? null, hasNext: Boolean(result.hasNext), size: result.size ?? result.content?.length ?? 0 };
};
const profilePage = async (path: string) => page<PublicProfile>(await apiRequest(path, { auth: true }));
export function parseOffsetPage<T>(value: unknown, pageNumber: number, size: number): OffsetPage<T> {
  const data = (value ?? {}) as Partial<OffsetPage<T>>;
  const content = Array.isArray(data.content) ? data.content : [];
  return { content: content as T[], page: data.page ?? pageNumber, size: data.size ?? size,
    totalElements: data.totalElements ?? content.length, totalPages: data.totalPages ?? (content.length < size ? pageNumber + 1 : pageNumber + 2),
    last: data.last ?? content.length < size };
}
export function notificationHasNext(items: unknown[], size: number) { return items.length === size; }
export function parseMentionMarkup(body: string) {
  const result: { text: string; userId?: string }[] = [];
  const pattern = /@\[([^\]]+)\]\(([0-9a-f]{8}-[0-9a-f-]{27,})\)/giu;
  let offset = 0;
  for (const match of body.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > offset) result.push({ text: body.slice(offset, start) });
    result.push({ text: `@${match[1]}`, userId: match[2] });
    offset = start + match[0].length;
  }
  if (offset < body.length) result.push({ text: body.slice(offset) });
  return result.length ? result : [{ text: body }];
}
export function insertMention(body: string, mention: PublicProfile) {
  if (parseMentionMarkup(body).filter((part) => part.userId).length >= 5) return null;
  return body.replace(/@[^\s@]*$/u, `@[${mention.displayName}](${mention.id}) `);
}
const offsetPage = async <T,>(path: string, pageNumber: number, size = 20) => parseOffsetPage<T>(await apiRequest(path, { auth: true }), pageNumber, size);

export const communityApi = {
  feed: async (cursor?: string, scope: 'ALL' | 'FOLLOWING' = 'ALL', category?: PostCategory, q?: string) => page<CommunityPost>(await apiRequest(`/api/community/posts?${query({ pagination: 'cursor', size: '10', scope, category, q, cursor })}`, { auth: true })),
  post: (id: string) => apiRequest<CommunityPost>(`/api/community/posts/${id}`, { auth: true }),
  create: (body: PostInput) => apiRequest<CommunityPost>('/api/community/posts', { method: 'POST', body, auth: true }),
  update: (id: string, body: PostInput) => apiRequest<CommunityPost>(`/api/community/posts/${id}`, { method: 'PUT', body, auth: true }),
  delete: (id: string) => apiRequest<void>(`/api/community/posts/${id}`, { method: 'DELETE', auth: true }),
  userPosts: async (id: string, cursor?: string) => page<CommunityPost>(await apiRequest(`/api/community/users/${id}/posts?${query({ size: '10', cursor })}`, { auth: true })),
  bookmarks: async (cursor?: string) => page<CommunityPost>(await apiRequest(`/api/community/posts/bookmarked?${query({ size: '10', cursor })}`, { auth: true })),
  react: (id: string, type: ReactionType = 'LIKE') => apiRequest<void>(`/api/community/posts/${id}/reactions/${type}`, { method: 'PUT', auth: true }),
  removeReaction: (id: string, type: ReactionType = 'LIKE') => apiRequest<void>(`/api/community/posts/${id}/reactions/${type}`, { method: 'DELETE', auth: true }),
  bookmark: (id: string, active: boolean) => apiRequest<void>(`/api/community/posts/${id}/bookmark`, { method: active ? 'DELETE' : 'POST', auth: true }),
  comments: async (id: string, pageNumber = 0) => offsetPage<Comment>(`/api/community/posts/${id}/comments?threaded=true&page=${pageNumber}&size=20`, pageNumber),
  replies: async (id: string, pageNumber = 0) => offsetPage<Comment>(`/api/community/comments/${id}/replies?page=${pageNumber}&size=20`, pageNumber),
  comment: (id: string, body: string, parentCommentId?: string) => apiRequest<Comment>(`/api/community/posts/${id}/comments`, { method: 'POST', body: { body, parentCommentId }, auth: true }),
  updateComment: (id: string, body: string) => apiRequest<Comment>(`/api/community/comments/${id}`, { method: 'PUT', body: { body }, auth: true }),
  deleteComment: (id: string) => apiRequest<void>(`/api/community/comments/${id}`, { method: 'DELETE', auth: true }),
  follow: (id: string, active: boolean) => apiRequest<void>(`/api/community/users/${id}/follow`, { method: active ? 'DELETE' : 'POST', auth: true }),
  relationship: (id: string) => apiRequest<{ following: boolean; followerCount: number; followingCount: number }>(`/api/community/users/${id}/relationship`, { auth: true }),
  followers: (id: string, cursor?: string) => profilePage(`/api/community/users/${id}/followers?${query({ size: '10', cursor })}`),
  following: (id: string, cursor?: string) => profilePage(`/api/community/users/${id}/following?${query({ size: '10', cursor })}`),
  profile: (id: string) => apiRequest<PublicProfile>(`/api/users/${id}/public-profile`, { auth: true }),
  mentionSuggestions: (q: string) => apiRequest<PublicProfile[]>(`/api/community/users/mention-suggestions?${query({ q })}`, { auth: true }),
  report: (contentType: 'POST' | 'COMMENT', contentId: string, reason: string) => apiRequest<void>('/api/community/reports', { method: 'POST', body: { contentType, contentId, reason }, auth: true }),
  notifications: async (pageNumber = 0, size = 20) => apiRequest<Notification[]>(`/api/notifications?page=${pageNumber}&size=${size}`, { auth: true }),
  unread: () => apiRequest<{ count: number }>('/api/notifications/unread-count', { auth: true }),
  markRead: (id: string) => apiRequest<void>(`/api/notifications/${id}/read`, { method: 'PUT', auth: true }),
  markAll: () => apiRequest<void>('/api/notifications/read-all', { method: 'PUT', auth: true }),
  preferences: () => apiRequest<NotificationPreference[]>('/api/notifications/preferences', { auth: true }),
  updatePreference: (eventType: string, enabled: boolean) => apiRequest<NotificationPreference>(`/api/notifications/preferences/${encodeURIComponent(eventType)}`, { method: 'PUT', body: { enabled }, auth: true }),
  uploadImage: async (uri: string, name: string, type: string) => {
    const data = await imageUploadForm({ uri, name, type });
    return apiRequest<{ url: string }>('/api/community/media/images', { method: 'POST', body: data, auth: true, timeoutMs: 60_000 });
  },
};
