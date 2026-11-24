/**
 * Storage keys that hold one learner's work on this device (drafts, answers, recordings, marks). They are removed when a
 * different learner signs in or the learner signs out. Device preferences (theme, reader settings, onboarding) are not
 * listed here on purpose: they belong to the phone, not to the account.
 */
export const USER_DATA_KEYS = {
  writingDraft: 'writing-draft:',
  writingResult: 'writing-result:',
  annotations: 'practice.annotations:',
  listeningPlayed: 'listening-played:',
  speakingSession: 'speaking-session:',
  speakingSend: 'speaking-send:',
  gradingKeepWaiting: 'grading-keep-waiting:',
  resume: 'practice.resume',
} as const;

/** Remembers whose work is stored, so signing in as someone else starts clean. */
export const SESSION_OWNER_KEY = 'ieltspath.sessionOwner';

export const USER_DATA_KEY_PREFIXES: readonly string[] = Object.values(USER_DATA_KEYS);
