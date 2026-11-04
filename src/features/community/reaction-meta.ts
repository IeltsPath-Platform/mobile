import { CheckCircle2, Heart, Lightbulb, ThumbsUp, type LucideIcon } from 'lucide-react-native';

import type { ReactionType } from '@/src/features/community/api';
import { colors } from '@/src/theme';

type ReactionMeta = { type: ReactionType; label: string; Icon: LucideIcon; color: string };

/** Single source of truth for reaction label / icon / accent. Color reads the active palette. */
const definitions: { type: ReactionType; label: string; Icon: LucideIcon; token: keyof typeof colors.reaction }[] = [
  { type: 'LIKE', label: 'Thích', Icon: ThumbsUp, token: 'like' },
  { type: 'LOVE', label: 'Yêu thích', Icon: Heart, token: 'love' },
  { type: 'HELPFUL', label: 'Hữu ích', Icon: Lightbulb, token: 'helpful' },
  { type: 'ACCURATE', label: 'Chính xác', Icon: CheckCircle2, token: 'accurate' },
];

export function getReactions(): ReactionMeta[] {
  return definitions.map(({ token, ...rest }) => ({ ...rest, color: colors.reaction[token] }));
}

export function getReaction(type: string | null | undefined): ReactionMeta | undefined {
  return getReactions().find((item) => item.type === type);
}
