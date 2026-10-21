import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { API_BASE_URL } from '@/src/lib/env';
import { gameApi } from './api';
import type { GameEvent } from './types';
export function useGameSocket(roomId: string | null, matchId: string | null, onEvent: (event: GameEvent) => void) {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!roomId) return;
    let socket: WebSocket | undefined; let retry: ReturnType<typeof setTimeout> | undefined; let handshake: ReturnType<typeof setTimeout> | undefined; let disposed = false; let terminal = false; let failures = 0;
    const connect = async () => {
      try {
        const ticket = await gameApi.ticket(roomId!); if (disposed || AppState.currentState !== 'active') return;
        const url = new URL('/ws/games', API_BASE_URL); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        socket = new WebSocket(url, ticket.subprotocols);
        handshake = setTimeout(() => socket?.close(), 10000);
        socket.onmessage = ({ data }) => { if (disposed) return; try { const event = JSON.parse(String(data)) as GameEvent; if (!event || typeof event.type !== 'string') return; if (event.type === 'CONNECTED') { clearTimeout(handshake); failures = 0; setConnected(true); if (matchId) socket?.send(JSON.stringify({ type: 'RECONNECT', matchId })); } if (event.type === 'ROOM_CLOSED' || event.type === 'PLAYER_KICKED') terminal = true; onEvent(event); } catch { /* Ignore malformed server frames. */ } };
        socket.onclose = () => { clearTimeout(handshake); if (disposed) return; setConnected(false); if (!terminal && AppState.currentState === 'active') retry = setTimeout(() => void connect(), Math.min(1000 * 2 ** failures++, 10000)); };
        socket.onerror = () => {
          if (__DEV__ && failures === 0) console.warn('[game] WebSocket connection failed', { url: socket?.url, readyState: socket?.readyState });
          socket?.close();
        };
      } catch (error) {
        if (__DEV__ && failures === 0) console.warn('[game] WebSocket setup failed', error);
        if (!disposed && AppState.currentState === 'active') retry = setTimeout(() => void connect(), Math.min(1000 * 2 ** failures++, 10000));
      }
    };
    void connect();
    const app = AppState.addEventListener('change', (state) => { if (state === 'active' && !terminal) { clearTimeout(retry); void connect(); } else { clearTimeout(retry); socket?.close(); setConnected(false); } });
    return () => { disposed = true; app.remove(); clearTimeout(retry); clearTimeout(handshake); socket?.close(); };
  }, [roomId, matchId, onEvent]);
  return connected;
}
