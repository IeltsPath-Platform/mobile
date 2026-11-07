# Vocabulary study and comment reactions — 2026-11-07

Mobile now uses the dedicated vocabulary-study contract for signed-in topic learning. The server owns exercise grading, unlocks, completion and mobile rewards; guest progress remains local. Existing topic layout is retained and shared by Home and the topic route.

Comment and reply reactions reuse the existing picker. Optimistic updates replace or toggle the current reaction, roll back only reaction fields on failure, and refetch the relevant thread.

Review found two gaps: unresolved Points purchases could lose their request ID when changing panels, and refresh did not refresh the unit catalog. Shared account query state now retains pending purchases within the app session, and catalog invalidation is included in refresh/error recovery. Full app restart recovery is not implemented.

TypeScript and all 88 tests across 13 files passed, including shared-purchase tests. Expo web export succeeded with 54 routes in `.expo/verification-vocabulary-study`. The read-only request to `localhost:8080/api/content/vocabulary/topics` could not connect, and CUA had no browser/apps available. No live backend/device E2E claim: iPhone keyboard, nested modal, reaction gestures and recorded audio still need device validation. Scope remained mobile only; no commit or backend change was made.
