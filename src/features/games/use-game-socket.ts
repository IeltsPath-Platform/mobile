import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { API_BASE_URL } from '@/src/lib/env';

import { gameApi } from './api';
import type { GameEvent } from './types';

const HANDSHAKE_TIMEOUT_MS = 10_000;
const MAX_RETRY_DELAY_MS = 10_000;

export function useGameSocket(
  roomId: string | null,
  matchId: string | null,
  onEvent: (event: GameEvent) => void,
) {
  const [connected, setConnected] = useState(false);
  // Handlers change identity between renders; a ref keeps the socket from reconnecting for that.
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!roomId) return;

    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let handshake: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let terminal = false;
    let connecting = false;
    let failures = 0;

    const scheduleRetry = () => {
      if (disposed || terminal || AppState.currentState !== 'active') return;
      clearTimeout(retry);
      const delay = Math.min(1_000 * 2 ** failures, MAX_RETRY_DELAY_MS);
      failures += 1;
      retry = setTimeout(() => void connect(), delay);
    };

    const connect = async () => {
      const socketState = socket?.readyState;
      if (
        disposed ||
        terminal ||
        connecting ||
        AppState.currentState !== 'active' ||
        socketState === WebSocket.CONNECTING ||
        socketState === WebSocket.OPEN ||
        socketState === WebSocket.CLOSING
      ) {
        return;
      }

      connecting = true;
      try {
        const ticket = await gameApi.ticket(roomId);
        if (disposed || AppState.currentState !== 'active') {
          connecting = false;
          return;
        }

        const url = new URL('/ws/games', API_BASE_URL);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        const candidate = new WebSocket(url, ticket.subprotocols);
        socket = candidate;
        connecting = false;

        handshake = setTimeout(() => {
          if (candidate.readyState === WebSocket.CONNECTING) candidate.close();
        }, HANDSHAKE_TIMEOUT_MS);

        candidate.onmessage = ({ data }) => {
          if (disposed) return;

          let event: GameEvent;
          try {
            const parsed: unknown = JSON.parse(String(data));
            if (
              typeof parsed !== 'object' ||
              parsed === null ||
              !('type' in parsed) ||
              typeof parsed.type !== 'string'
            ) {
              return;
            }
            event = parsed as GameEvent;
          } catch {
            return;
          }

          if (event.type === 'CONNECTED') {
            clearTimeout(handshake);
            failures = 0;
            setConnected(true);
            const message = matchId
              ? { type: 'RECONNECT', matchId }
              : { type: 'ROOM_STATE' };
            if (candidate.readyState === WebSocket.OPEN) {
              candidate.send(JSON.stringify(message));
            }
          }

          if (event.type === 'ROOM_CLOSED' || event.type === 'PLAYER_KICKED') {
            terminal = true;
            clearTimeout(retry);
          }

          onEventRef.current(event);
        };

        candidate.onclose = () => {
          clearTimeout(handshake);
          if (socket === candidate) {
            socket = undefined;
            setConnected(false);
          }
          scheduleRetry();
        };

        candidate.onerror = () => {
          if (__DEV__ && failures === 0) {
            console.warn('[game] WebSocket connection failed', {
              url: candidate.url,
              readyState: candidate.readyState,
            });
          }
          candidate.close();
        };
      } catch (error) {
        connecting = false;
        if (__DEV__ && failures === 0) console.warn('[game] WebSocket setup failed', error);
        scheduleRetry();
      }
    };

    void connect();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !terminal) {
        clearTimeout(retry);
        void connect();
        return;
      }

      clearTimeout(retry);
      socket?.close();
      setConnected(false);
    });

    return () => {
      disposed = true;
      appStateSubscription.remove();
      clearTimeout(retry);
      clearTimeout(handshake);
      socket?.close();
    };
  }, [matchId, roomId]);

  return connected;
}
