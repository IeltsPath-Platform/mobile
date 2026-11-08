import { Grid3x3, Rocket, type LucideIcon } from 'lucide-react-native';

import { colors } from '@/src/theme';

export type GameKind = 'WORDLY' | 'ROCKET';

export const toGameKind = (value: string | null | undefined): GameKind =>
  value === 'ROCKET' ? 'ROCKET' : 'WORDLY';

export const GAME_META: Record<
  GameKind,
  { name: string; Icon: LucideIcon }
> = {
  WORDLY: { name: 'Wordly', Icon: Grid3x3 },
  ROCKET: { name: 'Rocket', Icon: Rocket },
};

/** Per-game accent pair; reads the live palette so dark mode follows. */
export const gameTone = (kind: GameKind) =>
  kind === 'ROCKET'
    ? { solid: colors.accentWarm, soft: colors.warmSoft }
    : { solid: colors.accent, soft: colors.accentSoft };

export const matchRoute = (kind: string, matchId: string) =>
  (kind === 'ROCKET' ? `/games/rocket/${matchId}` : `/games/matches/${matchId}`) as never;

export const roomRoute = (roomId: string) => `/games/rooms/${roomId}` as never;

export const resultRoute = (matchId: string, gameType: GameKind) =>
  ({ pathname: '/games/results/[matchId]', params: { matchId, gameType } }) as never;

export const GAMES_HOME = '/games' as never;
export const PRACTICE_HOME = '/(tabs)/practice' as never;
