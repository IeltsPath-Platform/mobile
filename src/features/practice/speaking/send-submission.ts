// Ported from frontend/src/features/practice/speaking/sendSpeakingSubmission.ts. The mobile recorder already writes WAV,
// so there is no conversion step: each file is uploaded as it is.
import { completeSpeakingSubmission, createSpeakingSubmission, getSpeakingSubmission, uploadSpeakingRecording, type SpeakingSubmission } from '../api/speaking';
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
 * `sent` maps each question to the file uploaded under that `requestId` and must live as long as it: an answer recorded
 * again after a failed send is uploaded once more (the server replaces the stored one) instead of being skipped.
 */
export async function sendSpeakingSubmission(input: {
  requestId: string;
  packageVersionId: string;
  partSectionIds: string[];
  recordings: RecordingToSend[];
  maxRecordingBytes: number;
  sent: Map<string, string>;
  onProgress?: (progress: SendProgress) => void;
}): Promise<SpeakingSubmission> {
  for (const item of input.recordings) {
    if (item.recording.size > input.maxRecordingBytes) throw new RecordingTooLongError(item.label, maxSecondsFor(input.maxRecordingBytes));
  }
  const local = (questionVersionId: string) => input.recordings.find((candidate) => candidate.questionVersionId === questionVersionId);
  let submission: SpeakingSubmission;
  try {
    submission = await createSpeakingSubmission({ requestId: input.requestId, packageVersionId: input.packageVersionId, partSectionIds: input.partSectionIds, consent: true });
  } catch (cause) {
    const unsent = await unsentSubmissionOfThisTest(cause, input.packageVersionId, (id) => local(id) !== undefined);
    if (!unsent) throw cause;
    submission = unsent;
  }
  const pending = submission.recordings.filter((recording) => {
    if (!recording.uploaded) return true;
    const uploadedUri = input.sent.get(recording.questionVersionId);
    return uploadedUri !== undefined && uploadedUri !== local(recording.questionVersionId)?.recording.uri;
  });
  const total = submission.recordings.length;
  let done = total - pending.length;
  input.onProgress?.({ done, total });
  for (const wanted of pending) {
    const item = local(wanted.questionVersionId);
    if (!item) throw new RecordingMissingError();
    submission = await uploadSpeakingRecording(submission.id, wanted.questionVersionId, item.recording.uri, item.recording.durationSeconds * 1000);
    input.sent.set(wanted.questionVersionId, item.recording.uri);
    done += 1;
    input.onProgress?.({ done, total });
  }
  return completeSpeakingSubmission(submission.id);
}

/**
 * The submission that blocks a new one (409 SPEAKING_SUBMISSION_IN_PROGRESS), when it is this same test still waiting for
 * its files and this device holds an answer for each of its questions. That happens when a send broke after the
 * submission was opened and its request id was lost on the device: the server keeps such an upload open for half an
 * hour. Its files are sent under its id instead, so the learner is not locked out. A submission being graded, or one
 * for another test, is not touched.
 */
async function unsentSubmissionOfThisTest(cause: unknown, packageVersionId: string, hasAnswer: (questionVersionId: string) => boolean) {
  const error = cause as { code?: unknown; body?: unknown } | null;
  if (error?.code !== 'SPEAKING_SUBMISSION_IN_PROGRESS') return null;
  const id = (error.body as { submissionId?: unknown } | null | undefined)?.submissionId;
  if (typeof id !== 'string') return null;
  const open = await getSpeakingSubmission(id).catch(() => null);
  if (!open || open.status !== 'UPLOADING' || open.packageVersionId !== packageVersionId) return null;
  return open.recordings.every((recording) => recording.uploaded || hasAnswer(recording.questionVersionId)) ? open : null;
}
