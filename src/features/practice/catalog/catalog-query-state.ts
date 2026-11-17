type QueryState = { isPending: boolean; error: Error | null };

/**
 * Which tests are done is unknown only when the finished-test list never loaded; a failed refresh keeps the last list.
 * The catalog then still lists every test (nothing excluded) and the "done" tab is off.
 */
export function isCompletedUnknown(progress: { data?: unknown; error: Error | null }) {
  return progress.data === undefined && progress.error !== null;
}

/** Only a failed test search is an error of the screen; loading lasts until both the progress and the first page settle. */
export function catalogQueryState(progress: QueryState, tests: QueryState) {
  return { error: tests.error, loading: !tests.error && (progress.isPending || tests.isPending) };
}
