import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ createSpeakingSubmission: vi.fn(), uploadSpeakingRecording: vi.fn(), completeSpeakingSubmission: vi.fn(), getSpeakingSubmission: vi.fn() }));
vi.mock('@/src/features/practice/api/speaking', () => api);

import { RecordingMissingError, sendSpeakingSubmission } from '@/src/features/practice/speaking/send-submission';

const submission = (uploaded: Record<string, boolean>) => ({
  id: 'sub-1', status: 'UPLOADING',
  recordings: Object.entries(uploaded).map(([questionVersionId, done]) => ({ questionVersionId, uploaded: done })),
});
const answer = (questionVersionId: string, uri: string) => ({ questionVersionId, label: questionVersionId, recording: { uri, durationSeconds: 10, silent: false, size: 1000 } });
const input = (recordings: ReturnType<typeof answer>[], sent = new Map<string, string>()) => ({ requestId: 'r', packageVersionId: 'p', partSectionIds: ['s'], recordings, maxRecordingBytes: 10_000, sent });

beforeEach(() => {
  api.uploadSpeakingRecording.mockImplementation(async (id: string) => ({ ...submission({}), id }));
  api.completeSpeakingSubmission.mockResolvedValue({ id: 'sub-1', status: 'QUEUED' });
});

describe('sendSpeakingSubmission', () => {
  it('uploads only what the server does not have yet and remembers each uploaded file', async () => {
    api.createSpeakingSubmission.mockResolvedValue(submission({ q1: true, q2: false }));
    const sent = new Map<string, string>();
    await sendSpeakingSubmission(input([answer('q1', 'file:///a.wav'), answer('q2', 'file:///b.wav')], sent));
    expect(api.uploadSpeakingRecording.mock.calls.map((call) => call[1])).toEqual(['q2']);
    expect(sent.get('q2')).toBe('file:///b.wav');
    expect(api.completeSpeakingSubmission).toHaveBeenCalledWith('sub-1');
  });

  it('uploads again an answer recorded anew after a failed send of the same request', async () => {
    api.createSpeakingSubmission.mockResolvedValue(submission({ q1: true, q2: true }));
    const sent = new Map([['q1', 'file:///old.wav'], ['q2', 'file:///b.wav']]);
    await sendSpeakingSubmission(input([answer('q1', 'file:///new.wav'), answer('q2', 'file:///b.wav')], sent));
    expect(api.uploadSpeakingRecording.mock.calls.map((call) => [call[1], call[2]])).toEqual([['q1', 'file:///new.wav']]);
    expect(sent.get('q1')).toBe('file:///new.wav');
  });

  it('finishes the unsent submission of the same test that blocks a new one', async () => {
    api.createSpeakingSubmission.mockRejectedValue(Object.assign(new Error('in progress'), { code: 'SPEAKING_SUBMISSION_IN_PROGRESS', body: { submissionId: 'old' } }));
    api.getSpeakingSubmission.mockResolvedValue({ ...submission({ q1: false }), id: 'old', packageVersionId: 'p' });
    await sendSpeakingSubmission(input([answer('q1', 'file:///a.wav')]));
    expect(api.uploadSpeakingRecording.mock.calls.map((call) => [call[0], call[1]])).toEqual([['old', 'q1']]);
    expect(api.completeSpeakingSubmission).toHaveBeenCalledWith('old');
  });

  it('leaves alone a blocking submission that is being graded or belongs to another test', async () => {
    const blocked = Object.assign(new Error('in progress'), { code: 'SPEAKING_SUBMISSION_IN_PROGRESS', body: { submissionId: 'old' } });
    api.createSpeakingSubmission.mockRejectedValue(blocked);
    api.getSpeakingSubmission.mockResolvedValueOnce({ ...submission({ q1: true }), id: 'old', packageVersionId: 'p', status: 'GRADING' });
    await expect(sendSpeakingSubmission(input([answer('q1', 'file:///a.wav')]))).rejects.toBe(blocked);
    api.getSpeakingSubmission.mockResolvedValueOnce({ ...submission({ q1: false }), id: 'old', packageVersionId: 'other' });
    await expect(sendSpeakingSubmission(input([answer('q1', 'file:///a.wav')]))).rejects.toBe(blocked);
    expect(api.uploadSpeakingRecording).not.toHaveBeenCalled();
  });

  it('stops before completing when the server wants an answer this device does not have', async () => {
    api.createSpeakingSubmission.mockResolvedValue(submission({ q1: false }));
    await expect(sendSpeakingSubmission(input([]))).rejects.toBeInstanceOf(RecordingMissingError);
    expect(api.completeSpeakingSubmission).not.toHaveBeenCalled();
  });
});
