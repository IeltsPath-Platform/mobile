export type PlayerMode = 'SOLO' | 'MULTIPLAYER';
export type PlayMode = 'FINITE' | 'ENDLESS';
export type LetterStatus = 'CORRECT' | 'PRESENT' | 'ABSENT';
export type RoomSettings = { initialLives: number; wordTimeLimitSeconds: number | null; playMode: PlayMode | null; wordLimit: number | null; timeEnabled: boolean; questionCount?: number | null; secondsPerQuestion?: number | null };
export type CreateRoomInput = { playerMode: PlayerMode; initialLives: number; playMode: PlayMode; wordLimit: number | null; timeEnabled: boolean };
export type GameMember = { userId: string; role: string; status: string; joinedAt: string; slotNumber: number | null; displayName: string | null };
export type GameRoom = { id: string; roomCode: string; hostUserId: string; gameType: string; learningDomain: string; mode: string; maxPlayers: number; status: string; createdAt: string; members: GameMember[]; items: unknown[]; playerMode: PlayerMode; settings: RoomSettings | null; canStart: boolean; activeMatchId: string | null; message: string | null };
export type GameCatalog = { games: { gameType: string; name: string; description: string; status: string }[] };
export type RankingPlayer = { userId: string; displayName: string | null; slotNumber: number | null; rank: number; status: string; reconnectDeadlineAt?: string | null; livesRemaining: number; totalScore: number; totalSolveTimeMs: number; wordsProcessed: number; wordsSolved: number; currentStreak: number };
export type GameRanking = { matchId: string; status: string; playerMode: PlayerMode; isFinal: boolean; serverTime: string; players: RankingPlayer[] };
export type GameMatch = { matchId: string; roomId: string; sessionId: string | null; status: string; startedAt: string; players: { userId: string; score: number; rank: number | null; status: string }[]; playerMode: PlayerMode | null; settings: RoomSettings | null; ownPlayer: RankingPlayer | null; ranking: GameRanking | null };
export type WordPlayer = { status: string; livesRemaining: number; totalScore: number; currentStreak: number; bestStreak: number };
export type Hint = { playerWordId: string; sourceGuess: string; sourceLetters: LetterStatus[]; revealedCell: { column: number; letter: string; status: LetterStatus }; hintUsed: boolean };
export type CurrentWord = { playerWordId: string; wordNumber: number; wordLimit: number | null; meaning: string; columns: number; maxAttempts: number; attemptsUsed: number; timeEnabled: boolean; deadlineAt: string | null; wordStatus: string; player: WordPlayer; guesses: { attemptNumber: number; guess: string; letters: LetterStatus[] }[]; keyboard: Record<string, LetterStatus>; hint: Hint | null };
export type GuessInput = { requestId: string; playerWordId: string; guess: string };
export type GuessResponse = { requestId: string; playerWordId: string; guess: string; letters: LetterStatus[]; keyboard: Record<string, LetterStatus>; attemptsUsed: number; maxAttempts: number; wordStatus: string; points: { base: number; bonus: number; total: number }; player: WordPlayer; nextWord: CurrentWord | null; matchFinished: boolean; endReason: string | null };
export type PendingGuessResponse = { status: 202; code: 'REQUEST_PENDING'; message: string };
export type GameEvent = { type: string; matchId?: string; roomId?: string; room?: GameRoom; match?: GameMatch; ranking?: GameRanking; message?: string; userId?: string };
export type WordlyResult = { matchId: string; gameType: 'WORDLY'; playerMode: PlayerMode; players?: RankingPlayer[]; status: 'COMPLETED'; endReason: string | null; settings: RoomSettings; player: { userId: string; displayName: string | null; status: string; livesRemaining: number; wordsProcessed: number; wordsSolved: number; wordsFailed: number; wordsTimedOut: number; bestStreak: number; baseScore: number; bonusScore: number; totalScore: number; totalSolveTimeMs: number }; startedAt: string; endedAt: string; durationMs: number };
export type GameResult = WordlyResult | RocketResult;
export type GameTicket = { ticket: string; expiresAt: string; subprotocols: string[] };
export type ActiveGame = { roomId: string; roomCode: string; playerMode: PlayerMode; roomStatus: 'WAITING' | 'IN_MATCH'; matchId: string | null; playerStatus: string | null; gameType: 'WORDLY' | 'ROCKET' };
export type CreateRocketRoomInput = { playerMode: PlayerMode; questionCount: number; initialLives?: number; secondsPerQuestion?: number };
export type RocketSettings = { questionCount: number; initialLives: number; secondsPerQuestion: number };
export type RocketOption = { optionId: string; word: string };
export type RocketRound = { roundId: string; number: number; total: number; meaning: string; options: RocketOption[]; opensAt: string; deadlineAt: string | null; serverTime: string; me: { answered: boolean; optionId: string | null }; player: { livesRemaining: number; totalScore: number; status: string } };
export type RocketRoundResult = { roundId: string; correctOptionId: string; chosenOptionId: string | null; correct: boolean; points: number; livesRemaining: number; totalScore: number; status: string; nextRoundAt: string | null; matchFinished: boolean; endReason: string | null };
export type RocketCurrent = { matchId: string; settings: RocketSettings; round: RocketRound | null; lastRoundResult: RocketRoundResult | null; matchFinished: boolean; serverTime: string };
export type RocketAnswerAck = { requestId: string; roundId: string; optionId: string; receivedAt: string; roundResult: RocketRoundResult | null };
export type RocketResult = { matchId: string; endReason: string | null; settings: RocketSettings; totalRounds: number; answered: number; correctCount: number; livesRemaining: number; totalScore: number; playerStatus: string; durationMs: number; startedAt: string; endedAt: string };
export type LeftGame = { resultAvailable: boolean };

export function isGameAvailable(game: GameCatalog['games'][number], type: 'WORDLY' | 'ROCKET') { return game.gameType === type && game.status === 'AVAILABLE'; }
export function isWordlyAvailable(game: GameCatalog['games'][number]) { return isGameAvailable(game, 'WORDLY'); }
export function dueAt(deadlineAt: string | null, now: number) { return deadlineAt ? Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - now) / 1000)) : null; }
export function mergeRanking(current: GameRanking | null, incoming: GameRanking) { return !current || Date.parse(incoming.serverTime) >= Date.parse(current.serverTime) ? incoming : current; }
