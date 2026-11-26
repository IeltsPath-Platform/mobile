/** Rules the server applies to a new password. Sign-in is never checked, so older short passwords keep working. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_HINT = `Từ ${PASSWORD_MIN_LENGTH} đến ${PASSWORD_MAX_BYTES} ký tự`;

/** The server limit counts UTF-8 bytes, so a letter with diacritics takes two or three of the 72. */
function utf8Length(value: string) {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

export function newPasswordError(value: string): string | null {
  if (value.length < PASSWORD_MIN_LENGTH) return `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`;
  if (utf8Length(value) > PASSWORD_MAX_BYTES) return `Mật khẩu quá dài (tối đa ${PASSWORD_MAX_BYTES} ký tự, chữ có dấu tính nhiều hơn).`;
  return null;
}

const WEAK_REASONS: Record<string, string> = {
  TOO_SHORT: `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`,
  TOO_COMMON: 'Mật khẩu này quá phổ biến, hãy chọn mật khẩu khác.',
  CONTAINS_ACCOUNT_INFO: 'Mật khẩu không được chứa email, họ tên hoặc số điện thoại của bạn.',
  TOO_SIMPLE: 'Mật khẩu quá đơn giản, tránh chuỗi lặp hoặc liên tiếp (như 12345678).',
};

/** One sentence per reason of a `WEAK_PASSWORD` refusal; null when the server named none this app knows. */
export function weakPasswordMessage(reasons: string | undefined): string | null {
  const known = (reasons ?? '').split(',').map((reason) => WEAK_REASONS[reason.trim()]).filter(Boolean);
  return known.length ? known.join(' ') : null;
}
