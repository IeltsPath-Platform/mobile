import { ApiError } from '@/src/lib/api-client';

export function gameErrorMessage(reason: unknown) {
  if (!(reason instanceof Error)) return 'Chưa mở được ván chơi. Thử lại sau nhé.';
  if (reason instanceof ApiError && (reason.status === 503 || /content service|content.*unavailable/i.test(reason.message))) {
    return 'Máy chủ chưa tải được nội dung cho game. Hãy thử lại; nếu vẫn lỗi, kho nội dung game cần được kiểm tra trên máy chủ.';
  }
  if (reason instanceof ApiError && reason.status === 409 && /vocabulary|content|not enough/i.test(reason.message)) {
    return 'Chưa đủ từ vựng phù hợp để mở ván này. Thử giảm số câu hoặc kiểm tra kho từ đã xuất bản trên máy chủ.';
  }
  if (reason instanceof ApiError && reason.status === 409) {
    return 'Trạng thái phòng chơi vừa thay đổi nên chưa mở được ván. Hãy quay lại danh sách game và thử lại.';
  }
  return reason.message || 'Chưa mở được ván chơi. Thử lại sau nhé.';
}
