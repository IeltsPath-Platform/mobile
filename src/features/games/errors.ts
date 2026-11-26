import { ApiError } from '@/src/lib/api-client';
import { safeErrorMessage } from '@/src/lib/error-message';

const FALLBACK = 'Chưa mở được ván chơi. Thử lại sau nhé.';
const CONTENT_UNAVAILABLE = ['WORD_SOURCE_UNAVAILABLE', 'WORD_FILTERS_UNAVAILABLE', 'GAME_CONTENT_UNAVAILABLE'];

export function gameErrorMessage(reason: unknown) {
  if (!(reason instanceof ApiError)) return safeErrorMessage(reason, FALLBACK);
  if (reason.code === 'USER_PROFILE_UNAVAILABLE') return 'Chưa đọc được thông tin tài khoản để vào phòng. Hãy thử lại sau ít phút.';
  if (reason.code && CONTENT_UNAVAILABLE.includes(reason.code)) return 'Chưa tải được nội dung trò chơi. Hãy thử lại sau ít phút.';
  if (reason.code === 'NOT_ENOUGH_WORDS') return 'Chưa đủ từ phù hợp để mở ván này. Hãy giảm số câu hoặc đổi chủ đề, cấp độ.';
  return safeErrorMessage(reason, FALLBACK);
}

/** The server no longer has this room or match for the caller, so cached data must not be played on. */
export function isGone(reason: unknown) {
  return reason instanceof ApiError && (reason.status === 403 || reason.status === 404);
}
