# Mobile flashcards audit — 2026-11-07

Compared mobile calls with library-service controllers in the local backend source. Backend files were not modified. All calls below use authenticated API requests; no mock data is used.

| Backend contract | Mobile consumer |
| --- | --- |
| GET/POST `/api/learning-support/decks`, GET/PUT/DELETE `/decks/{id}` | Library, deck editor and detail |
| GET/POST `/decks/{id}/items`, DELETE `/decks/{id}/items/{cardId}` | Paged deck detail, select existing cards, create in deck, remove membership |
| GET/POST `/api/learning-support/flashcards`, GET/PUT/DELETE `/flashcards/{id}` | Card library and editor; MANUAL and VOCABULARY_SENSE creation |
| POST `/flashcards/images` | Card image and deck cover upload, shared multipart builder |
| GET `/flashcards/due`, POST `/flashcards/{id}/reviews` | Global/deck study, shared `useDueStudy`; requestId retained on retry and sessionId sent |
| GET/POST `/flashcards/notebook/entries`, PUT `/entries/{id}/level`, GET `/saved` | Notebook filtering, search/add, level change; saved IDs batched at 100 |
| GET `/notebook/summary`, GET/PUT `/weekly-goal` | Library summary and vocabulary progress using account timezone |
| GET `/notebook/vocabulary-map`, `/topics-progress`, `/sets/{id}/progress`, `/recent-result`, `/achievements` | Progress screen; optional panels fetched on demand |
| Vocabulary search, sets and words | Catalog selection and notebook additions |

There are no missing endpoint wrappers for these four flashcard/deck/notebook/progress controllers. Source-specific creation such as PRACTICE_QUESTION belongs to its originating practice flow; the card editor preserves the original source when updating.

## Corrections

- Deck detail now requests 30 items at a time and virtualizes rows rather than fetching/rendering the entire deck.
- List requests support AbortSignal; library summary cache is shared with progress.
- Study review handling is shared. Leaving through the back gesture/header also invalidates progress. Additional due batches always start at page 0 because reviewed cards leave the queue.
- Background refetch no longer replaces unsaved card/deck edits.
- Example input limit now matches the backend's 1,000 characters.
- Removed duplicated editor hero headings and the misleading notebook-only study CTA (it opened all due cards). Library scroll position survives navigating to a card and back.
- Long flashcard content is scrollable; study controls remain reachable on smaller displays.

## Wordly hint

`UseWordlyHintUseCase` requires an ACTIVE word/player and at least one accepted guess. The button now explains that prerequisite. The server-revealed letter appears next to the hint action; errors are shown there too. Late hint responses cannot attach to a different word, and pending current-word reads are cancelled before updating the cache. Hint markers apply only to the current guess row.

## Verification scope

Contract/helper tests use a mocked HTTP boundary, not a mocked production data source. Type checking and bundle export validate compilation. Authenticated device flows (uploading photos, swiping back, native keyboard and playing a complete match) still require device verification; no connected browser/device was available during this audit. Performance changes above are structural improvements, not measured FPS or latency claims.
