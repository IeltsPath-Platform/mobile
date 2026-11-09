export const SESSION_DONE_KEY = ['session', 'done'] as const;

export type SessionDone = {
  nodeId: string;
  lessonCompleted: boolean;
};
