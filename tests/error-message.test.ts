import { describe, expect, it } from 'vitest';

import { safeErrorMessage, userFacingMessage } from '../src/lib/error-message';

describe('user-facing error messages', () => {
  it('keeps clear Vietnamese server messages', () => {
    expect(userFacingMessage(400, 'Bạn chưa nhập email.')).toBe('Bạn chưa nhập email.');
  });

  it.each([
    [403, 'Bạn không có quyền thực hiện thao tác này.'],
    [404, 'Không tìm thấy nội dung này. Nội dung có thể đã bị xóa hoặc không còn khả dụng.'],
    [500, 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'],
  ])('uses Vietnamese status fallback for HTTP %s', (status, expected) => {
    expect(userFacingMessage(status, 'Something failed.')).toBe(expected);
  });

  it.each([
    'SESSION_REVOKED: Phiên đã bị thu hồi.',
    'Request failed: internal server error',
    'java.lang.IllegalStateException: Không thể tải dữ liệu.',
    'Không tìm thấy nội dung 123e4567-e89b-12d3-a456-426614174000.',
  ])('replaces technical or mixed server text: %s', (message) => {
    expect(userFacingMessage(500, message)).toBe('Máy chủ đang gặp sự cố. Vui lòng thử lại sau.');
  });

  it('uses a Vietnamese fallback for native and library exceptions', () => {
    expect(safeErrorMessage(new Error('Network request failed'), 'Không tải được ảnh.')).toBe('Không tải được ảnh.');
    expect(safeErrorMessage(new Error('Ảnh cần nhỏ hơn 20 MB.'))).toBe('Ảnh cần nhỏ hơn 20 MB.');
  });
});

describe('acronyms the app writes itself', () => {
  it('does not mistake IELTS or CEFR for a technical code', () => {
    expect(userFacingMessage(400, 'Đề IELTS này chưa được xuất bản.')).toBe('Đề IELTS này chưa được xuất bản.');
    expect(userFacingMessage(400, 'Chọn cấp độ CEFR khác.')).toBe('Chọn cấp độ CEFR khác.');
  });

  it('still hides a code next to an acronym', () => {
    expect(userFacingMessage(500, 'Lỗi IELTS: PREMIUM_REQUIRED')).toBe('Máy chủ đang gặp sự cố. Vui lòng thử lại sau.');
  });
});
