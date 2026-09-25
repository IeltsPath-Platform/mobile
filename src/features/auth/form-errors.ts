import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError } from '@/src/lib/api-client';

/**
 * Pushes backend field errors (ErrorResponse.details) into the form and
 * returns the message to show in the form-level alert.
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string {
  if (!(error instanceof ApiError)) return 'Có lỗi xảy ra, vui lòng thử lại.';

  let matchedField = false;
  for (const [field, message] of Object.entries(error.details)) {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: 'server', message });
      matchedField = true;
    }
  }
  return matchedField ? 'Vui lòng kiểm tra lại thông tin.' : error.message;
}
