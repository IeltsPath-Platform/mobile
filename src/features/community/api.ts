import { apiRequest } from '@/src/lib/api-client';

export type PostCategory = 'GENERAL' | 'QUESTION' | 'DISCUSSION';

export type PostResponse = {
  id: string;
  authorId: string;
  category: PostCategory;
  title: string | null;
  body: string;
  status: string;
  reactions: Record<string, number>;
  createdAt: string;
  updatedAt: string;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  sort: string;
};

export type CreatePostBody = {
  category: PostCategory;
  title?: string;
  body: string;
};

export const communityApi = {
  listPosts: (page = 0, size = 20) =>
    apiRequest<PageResponse<PostResponse>>(`/api/community/posts?page=${page}&size=${size}`, { auth: true }),

  createPost: (body: CreatePostBody) =>
    apiRequest<PostResponse>('/api/community/posts', { method: 'POST', body, auth: true }),

  react: (postId: string, type: string = 'LIKE') =>
    apiRequest<void>(`/api/community/posts/${postId}/reactions/${type}`, { method: 'PUT', auth: true }),
};
