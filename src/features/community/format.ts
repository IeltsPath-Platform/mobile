import type { PostCategory } from './api';

/** Short relative time for feed rows: "Vừa xong", "5 phút", "2 giờ", "3 ngày", then a date. */
export function timeAgo(value: string) {
  const date = new Date(value);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'Vừa xong';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)} ngày`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  GENERAL: 'Chung',
  QUESTION: 'Hỏi đáp',
  DISCUSSION: 'Thảo luận',
  WRITING_SHARING: 'Chia sẻ Writing',
  SPEAKING_PARTNER: 'Tìm bạn Speaking',
  RESOURCE_TIPS: 'Tài nguyên & mẹo',
};

export function totalReactions(counts?: Record<string, number> | null) {
  return Object.values(counts ?? {}).reduce((sum, count) => sum + count, 0);
}
