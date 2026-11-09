import { ApiError } from '@/src/lib/api-client';

export function gameErrorMessage(reason: unknown) {
  if (!(reason instanceof Error)) return 'Chưa mở được ván chơi. Thử lại sau nhé.';
  if (reason instanceof ApiError && reason.code === 'USER_PROFILE_UNAVAILABLE') {
    return 'Game chưa kết nối được dịch vụ tài khoản để tạo phòng. Hãy kiểm tra cấu hình game-service trên máy chủ.';
  }
  if (reason instanceof ApiError && (reason.code === 'WORD_SOURCE_UNAVAILABLE' || reason.code === 'WORD_FILTERS_UNAVAILABLE' || reason.code === 'GAME_CONTENT_UNAVAILABLE' || /content service|content.*unavailable/i.test(reason.message))) {
    return 'Máy chủ chưa tải được nội dung cho game. Hãy thử lại; nếu vẫn lỗi, kho nội dung game cần được kiểm tra trên máy chủ.';
  }
  if (reason instanceof ApiError && reason.status === 503) {
    return reason.message || 'Dịch vụ game tạm thời chưa sẵn sàng. Hãy thử lại sau.';
  }
  if (reason instanceof ApiError && reason.status === 409 && /vocabulary|content|not enough/i.test(reason.message)) {
    return 'Chưa đủ từ vựng phù hợp để mở ván này. Thử giảm số câu hoặc kiểm tra kho từ đã xuất bản trên máy chủ.';
  }
  if (reason instanceof ApiError && reason.status === 409) {
    return 'Trạng thái phòng chơi vừa thay đổi nên chưa mở được ván. Hãy quay lại danh sách game và thử lại.';
  }
  return reason.message || 'Chưa mở được ván chơi. Thử lại sau nhé.';
}
