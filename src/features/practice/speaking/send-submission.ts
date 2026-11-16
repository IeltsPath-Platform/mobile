// Ported from frontend/src/features/practice/speaking/sendSpeakingSubmission.ts. The mobile recorder already writes WAV,
// so there is no conversion step: each file is uploaded as it is.
import { completeSpeakingSubmission, createSpeakingSubmission, uploadSpeakingRecording, type SpeakingSubmission } from '../api/speaking';
import type { SavedRecording } from '../model/speaking-session';

/** An answer is too long to send: its WAV is over the size the server accepts for one question. */
export class RecordingTooLongError extends Error {
  constructor(label: string, maxSeconds: number) {
    super(`${label} dài quá giới hạn (tối đa khoảng ${Math.floor(maxSeconds / 60)} phút ${Math.floor(maxSeconds % 60)} giây). Hãy ghi lại ngắn hơn.`);
    this.name = 'RecordingTooLongError';
  }
}

/** The server wants a recording this device does not have (the test changed, or the file was removed). */
export class RecordingMissingError extends Error {
  constructor() {
    super('Thiếu bản ghi của một câu hỏi. Hãy quay lại ghi âm câu đó.');
    this.name = 'RecordingMissingError';
  }
}

export interface RecordingToSend {
  questionVersionId: string;
  /** How the learner knows the question, such as "Part 1, câu 2". */
  label: string;
  recording: SavedRecording;
}

export interface SendProgress { done: number; total: number }

/** Seconds of 16 kHz mono 16-bit WAV that fit in `maxBytes`. */
export function maxSecondsFor(maxBytes: number) {
  return Math.floor((maxBytes - 44) / (16000 * 2));
}

/**
 * Opens the submission (the server checks the points first), uploads each answer that is not stored yet, then completes
 * it. Sending again with the same `requestId` after a failure continues the same submission and skips what is stored.
 */
export async function sendSpeakingSubmission(input: {
  requestId: string;
  packageVersionId: string;
  partSectionIds: string[];
  recordings: RecordingToSend[];
  maxRecordingBytes: number;
  onProgress?: (progress: SendProgress) => void;
}): Promise<SpeakingSubmission> {
  for (const item of input.recordings) {
    if (item.recording.size > input.maxRecordingBytes) throw new RecordingTooLongError(item.label, maxSecondsFor(input.maxRecordingBytes));
  }
  let submission = await createSpeakingSubmission({ requestId: input.requestId, packageVersionId: input.packageVersionId, partSectionIds: input.partSectionIds, consent: true });
  const pending = submission.recordings.filter((recording) => !recording.uploaded);
  const total = submission.recordings.length;
  let done = total - pending.length;
  input.onProgress?.({ done, total });
  for (const wanted of pending) {
    const item = input.recordings.find((candidate) => candidate.questionVersionId === wanted.questionVersionId);
    if (!item) throw new RecordingMissingError();
    submission = await uploadSpeakingRecording(submission.id, wanted.questionVersionId, item.recording.uri, item.recording.durationSeconds * 1000);
    done += 1;
    input.onProgress?.({ done, total });
  }
  return completeSpeakingSubmission(submission.id);
}
