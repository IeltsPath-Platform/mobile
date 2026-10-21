import { apiRequest } from '@/src/lib/api-client';
import type { CreateRoomInput, CurrentWord, GameCatalog, GameMatch, GameRanking, GameResult, GameRoom, GameTicket, GuessInput, GuessResponse, PendingGuessResponse, RoomSettings, Hint } from './types';
const room = (id: string) => `/api/games/rooms/${encodeURIComponent(id)}`;
const match = (id: string) => `/api/games/matches/${encodeURIComponent(id)}`;
export const gameApi = {
  catalog: () => apiRequest<GameCatalog>('/api/games/catalog', { auth: true }),
  create: (input: CreateRoomInput) => apiRequest<GameRoom>('/api/games/wordly/rooms', { method: 'POST', body: input, auth: true }),
  getRoom: (id: string, signal?: AbortSignal) => apiRequest<GameRoom>(room(id), { auth: true, signal }),
  join: (code: string) => apiRequest<GameRoom>(`/api/games/rooms/code/${encodeURIComponent(code)}/join`, { method: 'POST', auth: true }),
  ready: (id: string, ready: boolean) => apiRequest<GameRoom>(`${room(id)}/ready`, { method: 'POST', body: { ready }, auth: true }),
  settings: (id: string, body: Pick<RoomSettings, 'initialLives' | 'wordLimit' | 'timeEnabled'>) => apiRequest<GameRoom>(`${room(id)}/settings`, { method: 'PUT', body, auth: true }),
  leaveRoom: (id: string) => apiRequest<GameRoom>(`${room(id)}/leave`, { method: 'POST', auth: true }),
  start: (id: string) => apiRequest<GameMatch>(`${room(id)}/start`, { method: 'POST', auth: true }),
  kick: (id: string, userId: string) => apiRequest<GameRoom>(`${room(id)}/members/${encodeURIComponent(userId)}/kick`, { method: 'POST', auth: true }),
  ticket: (id: string) => apiRequest<GameTicket>(`${room(id)}/websocket-ticket`, { method: 'POST', auth: true }),
  getMatch: (id: string, signal?: AbortSignal) => apiRequest<GameMatch>(match(id), { auth: true, signal }),
  current: (id: string, signal?: AbortSignal) => apiRequest<CurrentWord>(`${match(id)}/words/current`, { auth: true, signal }),
  guess: (id: string, body: GuessInput) => apiRequest<GuessResponse | PendingGuessResponse>(`${match(id)}/guesses`, { method: 'POST', body, auth: true }),
  hint: (id: string, wordId: string, requestId: string) => apiRequest<Hint>(`${match(id)}/words/${encodeURIComponent(wordId)}/hint`, { method: 'POST', body: { requestId }, auth: true }),
  ranking: (id: string) => apiRequest<GameRanking>(`${match(id)}/ranking`, { auth: true }),
  result: (id: string) => apiRequest<GameResult>(`${match(id)}/result`, { auth: true }),
  leaveMatch: (id: string) => apiRequest<{ resultAvailable: boolean }>(`${match(id)}/leave`, { method: 'POST', auth: true }),
};
