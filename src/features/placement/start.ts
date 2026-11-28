import { ApiError } from '@/src/lib/api-client';
import { safeErrorMessage } from '@/src/lib/error-message';

import { placementApi, type PlacementAssignment, type PlacementOptions, type PlacementPool } from './api';

/**
 * Takes an exam of the pool and opens an attempt on it, resolving the attempt id. The open assignment is reused when it
 * is of the same pool; otherwise it is released for a new one, which needs a retake left (checked first, so the only
 * assignment a learner holds is never given up for nothing). A failed start releases what it assigned.
 */
export async function startPlacement(options: PlacementOptions, pool: PlacementPool): Promise<string> {
  let assigned: PlacementAssignment | null = null;
  try {
    const open = options.openAssignment;
    let assignment: PlacementAssignment;
    if (open?.pool === pool) {
      assignment = open;
    } else {
      if (options.retakesLeft <= 0) throw new ApiError(429, 'Bạn đã dùng hết lượt làm trong 24 giờ.', null, { code: 'PLACEMENT_LIMIT_REACHED' });
      if (open) await placementApi.release(open.assignmentId);
      assigned = await placementApi.assign(pool);
      assignment = assigned;
    }
    return (await placementApi.start(assignment.packageVersionId)).id;
  } catch (cause) {
    if (assigned) await placementApi.release(assigned.assignmentId).catch(() => undefined);
    throw cause;
  }
}

/** What to tell the learner when a start fails. */
export function startErrorMessage(cause: unknown, options: PlacementOptions) {
  const code = cause instanceof ApiError ? cause.code : undefined;
  if (code === 'PLACEMENT_LIMIT_REACHED') {
    const next = options.nextRetakeAt ? new Date(options.nextRetakeAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : null;
    return `Bạn đã dùng hết lượt làm trong 24 giờ.${next ? ` Có thể làm lại từ ${next}.` : ''}`;
  }
  if (code === 'NO_PLACEMENT_TEST') return 'Mức này hiện chưa có đề. Hãy chọn mức khác.';
  return safeErrorMessage(cause, 'Chưa bắt đầu được bài kiểm tra. Hãy thử lại.');
}
