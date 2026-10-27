import { apiRequest } from '@/src/lib/api-client';
import type { ActiveGame, CreateRocketRoomInput, CreateRoomInput, CurrentWord, GameCatalog, GameMatch, GameRanking, WordlyResult, GameRoom, GameTicket, GuessInput, GuessResponse, PendingGuessResponse, RoomSettings, Hint, RocketAnswerAck, RocketCurrent, RocketResult, LeftGame } from './types';
const room = (id: string) => `/api/games/rooms/${encodeURIComponent(id)}`;
const match = (id: string) => `/api/games/matches/${encodeURIComponent(id)}`;
export const gameApi = {
  catalog: () => apiRequest<GameCatalog>('/api/games/catalog', { auth: true }),
  activeGame: () => apiRequest<ActiveGame | null>('/api/games/me/active-game', { auth: true }),
  leaveActiveGame: () => apiRequest<void>('/api/games/me/active-game/leave', { method: 'POST', auth: true }),
  create: (input: CreateRoomInput) => apiRequest<GameRoom>('/api/games/wordly/rooms', { method: 'POST', body: input, auth: true }),
  createRocket: (input: CreateRocketRoomInput) => apiRequest<GameRoom>('/api/games/rocket/rooms', { method: 'POST', body: input, auth: true }),
  getRoom: (id: string, signal?: AbortSignal) => apiRequest<GameRoom>(room(id), { auth: true, signal }),
  getRoomByCode: (code: string, signal?: AbortSignal) => apiRequest<GameRoom>(`/api/games/rooms/code/${encodeURIComponent(code.trim().toUpperCase())}`, { auth: true, signal }),
  join: (code: string) => apiRequest<GameRoom>(`/api/games/rooms/code/${encodeURIComponent(code)}/join`, { method: 'POST', auth: true }),
  ready: (id: string, ready: boolean) => apiRequest<GameRoom>(`${room(id)}/ready`, { method: 'POST', body: { ready }, auth: true }),
  settings: (id: string, body: { initialLives: number; wordLimit?: number | null; timeEnabled?: boolean; questionCount?: number | null; secondsPerQuestion?: number | null }) => apiRequest<GameRoom>(`${room(id)}/settings`, { method: 'PUT', body, auth: true }),
  leaveRoom: (id: string) => apiRequest<GameRoom>(`${room(id)}/leave`, { method: 'POST', auth: true }),
  closeRoom: (id: string) => apiRequest<GameRoom>(`${room(id)}/close`, { method: 'POST', auth: true }),
  start: (id: string) => apiRequest<GameMatch>(`${room(id)}/start`, { method: 'POST', auth: true }),
  kick: (id: string, userId: string) => apiRequest<GameRoom>(`${room(id)}/members/${encodeURIComponent(userId)}/kick`, { method: 'POST', auth: true }),
  ticket: (id: string) => apiRequest<GameTicket>(`${room(id)}/websocket-ticket`, { method: 'POST', auth: true }),
  getMatch: (id: string, signal?: AbortSignal) => apiRequest<GameMatch>(match(id), { auth: true, signal }),
  current: (id: string, signal?: AbortSignal) => apiRequest<CurrentWord>(`${match(id)}/words/current`, { auth: true, signal }),
  guess: (id: string, body: GuessInput) => apiRequest<GuessResponse | PendingGuessResponse>(`${match(id)}/guesses`, { method: 'POST', body, auth: true }),
  hint: (id: string, wordId: string, requestId: string) => apiRequest<Hint>(`${match(id)}/words/${encodeURIComponent(wordId)}/hint`, { method: 'POST', body: { requestId }, auth: true }),
  ranking: (id: string) => apiRequest<GameRanking>(`${match(id)}/ranking`, { auth: true }),
  result: (id: string) => apiRequest<WordlyResult>(`${match(id)}/result`, { auth: true }),
  leaveMatch: (id: string) => apiRequest<LeftGame>(`${match(id)}/leave`, { method: 'POST', auth: true }),
  rocketCurrent: (id: string, signal?: AbortSignal) => apiRequest<RocketCurrent>(`/api/games/rocket/matches/${encodeURIComponent(id)}/rounds/current`, { auth: true, signal }),
  rocketAnswer: (id: string, roundId: string, requestId: string, optionId: string) => apiRequest<RocketAnswerAck>(`/api/games/rocket/matches/${encodeURIComponent(id)}/rounds/${encodeURIComponent(roundId)}/answers`, { method: 'POST', body: { requestId, optionId }, auth: true }),
  rocketResult: (id: string) => apiRequest<RocketResult>(`${match(id)}/result`, { auth: true }),
};
