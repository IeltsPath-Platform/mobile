export const DELETION_KEPT_NOTE =
  'Bài viết và bình luận cộng đồng vẫn còn, tên tác giả đổi thành "Người dùng đã xóa". Lịch sử giao dịch được giữ ở dạng ẩn danh để đối soát.';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar days the learner has had the account, counting the first day as day 1; null when the date is unknown. */
export function daysWithUs(createdAt: string | undefined, now: Date = new Date()): number | null {
  if (!createdAt) return null;
  const start = new Date(createdAt).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(1, Math.floor((now.getTime() - start) / DAY_MS) + 1);
}

/** Joins items the way Vietnamese writes a list: "a, b và c". */
function joinList(items: string[]) {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} và ${items[items.length - 1]}`;
}

/**
 * What the learner loses, written as one sentence with their own numbers. Anything we could not read
 * (points, plan) is simply left out rather than shown as a placeholder.
 */
export function deletionSummary(input: { balance?: number | null; premium?: boolean }) {
  const lost = ['tiến độ học', 'bài nộp', 'bản ghi âm', 'flashcard'];
  if (input.balance != null && input.balance > 0) lost.push(`${input.balance.toLocaleString('vi-VN')} điểm`);
  if (input.premium) lost.push('gói Premium đang dùng');
  return `Xóa tài khoản sẽ xóa luôn ${joinList(lost)}. Không thể khôi phục.`;
}
