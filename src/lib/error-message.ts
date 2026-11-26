const VIETNAMESE_LETTER = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const BY_STATUS: Record<number, string> = {
  400: 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra và thử lại.',
  401: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy nội dung này. Nội dung có thể đã bị xóa hoặc không còn khả dụng.',
  408: 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.',
  409: 'Thao tác này xung đột với trạng thái hiện tại. Vui lòng tải lại rồi thử lại.',
  422: 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra và thử lại.',
  502: 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại sau ít phút.',
  503: 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại sau ít phút.',
  504: 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.',
};
const SERVER_ERROR = 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
const GENERIC = 'Có lỗi xảy ra, vui lòng thử lại.';
const TECHNICAL_CODE = /\b[A-Z][A-Z0-9_]{3,}\b/;
const TECHNICAL_UUID = /\b[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\b/i;
const TECHNICAL_NAME = /\b[\w.]*exception\b|java\.|org\.springframework|stack trace/i;
const ENGLISH_ERROR = /\b(?:failed|failure|error|invalid|denied|unauthorized|forbidden|not found|please|request|server|network|timeout|expired|already|could not|unable|unknown|service|internal)\b/i;

function isSafeVietnamese(text: string) {
  return VIETNAMESE_LETTER.test(text) && !TECHNICAL_CODE.test(text.replace(PLAIN_ACRONYMS, '')) && !TECHNICAL_UUID.test(text)
    && !TECHNICAL_NAME.test(text) && !ENGLISH_ERROR.test(text);
}

/** Names the app itself writes in capitals; without this a Vietnamese sentence that mentions them reads as a code. */
const PLAIN_ACRONYMS = /\b(?:IELTS|CEFR|JPEG|HEIC|WEBP)\b/g;

/**
 * The text of a server error for the learner. Messages with Vietnamese letters are written for people and pass through;
 * anything else (an English or technical sentence from a service that has not been translated yet) is replaced by a
 * sentence for the status, so the screen never shows "Submission was not found". The original stays on `ApiError.body`.
 */
export function userFacingMessage(status: number, message: string | undefined | null): string {
  const text = message?.trim();
  if (text && isSafeVietnamese(text)) return text;
  return BY_STATUS[status] ?? (status >= 500 ? SERVER_ERROR : GENERIC);
}

/** Keeps native/library exceptions and other non-API failures from leaking technical English into the UI. */
export function safeErrorMessage(error: unknown, fallback = GENERIC): string {
  const text = error instanceof Error ? error.message.trim() : '';
  return text && isSafeVietnamese(text) ? text : fallback;
}
