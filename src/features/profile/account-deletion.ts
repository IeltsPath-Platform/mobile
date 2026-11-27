/** The word the learner types to show the deletion is deliberate. */
export const DELETE_CONFIRM_WORD = 'XÓA';

/** Whether the typed word matches, ignoring case and surrounding spaces. */
export function isDeleteConfirmed(value: string) {
  return value.trim().toLocaleUpperCase('vi-VN') === DELETE_CONFIRM_WORD;
}

/** What happens to the learner's data; the same policy the web page and the backend follow. */
export const DELETION_CONSEQUENCES = [
  'Bạn bị đăng xuất khỏi mọi thiết bị và không thể đăng nhập lại bằng tài khoản này.',
  'Hồ sơ, tiến độ học, bài nộp, bản ghi âm, flashcard và thông báo của bạn bị xóa.',
  'Bài viết và bình luận cộng đồng được giữ lại, tác giả hiển thị là "Người dùng đã xóa".',
  'Lịch sử giao dịch và điểm được giữ ở dạng không định danh để đối soát; số dư điểm và gói Premium đang dùng bị hủy.',
  'Bạn có thể đăng ký lại bằng cùng email, nhưng đó là một tài khoản mới hoàn toàn.',
] as const;
