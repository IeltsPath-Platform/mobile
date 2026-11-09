import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeOutUp, ZoomIn } from 'react-native-reanimated';
import { Flame, Heart, PartyPopper, Sparkles, Star, type LucideIcon } from 'lucide-react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

export type RewardKind = 'solved' | 'streak' | 'milestone' | 'life' | 'complete';

export type Reward = {
  /** Unique per event; a new id replays the animation. */
  id: number;
  kind: RewardKind;
  title: string;
  subtitle?: string;
};

function look(kind: RewardKind): { Icon: LucideIcon; bg: string; fg: string; badge: string } {
  switch (kind) {
    case 'streak':
      return { Icon: Flame, bg: colors.warmSoft, fg: colors.xpDeep, badge: colors.accentWarm };
    case 'milestone':
      return { Icon: Star, bg: colors.warmSoft, fg: colors.xpDeep, badge: colors.xp };
    case 'life':
      return { Icon: Heart, bg: colors.dangerSoft, fg: colors.danger, badge: colors.danger };
    case 'complete':
      return { Icon: PartyPopper, bg: colors.successSoft, fg: colors.success, badge: colors.success };
    default:
      return { Icon: Sparkles, bg: colors.successSoft, fg: colors.success, badge: colors.success };
  }
}

/**
 * Pill that pops in near the top of the screen and clears itself.
 * Render it inside a positioned container; it ignores touches.
 */
export function RewardToast({ reward, onDone, top = 8, duration = 1900 }: { reward: Reward | null; onDone: () => void; top?: number; duration?: number }) {
  useEffect(() => {
    if (!reward) return;
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [reward, onDone, duration]);

  if (!reward) return null;
  const { Icon, bg, fg, badge } = look(reward.kind);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top, alignItems: 'center', zIndex: 20 }}>
      <Animated.View
        key={reward.id}
        entering={ZoomIn.springify().damping(12)}
        exiting={FadeOutUp.duration(220)}
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderRadius: 999,
          paddingVertical: 8,
          paddingLeft: 8,
          paddingRight: 20,
          backgroundColor: bg,
          shadowColor: colors.shadow,
          shadowOpacity: 0.18,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: 6,
        }}
      >
        <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: badge }}>
          <Icon size={20} color={colors.onAccent} fill={reward.kind === 'streak' || reward.kind === 'life' ? colors.onAccent : 'transparent'} />
        </View>
        <View>
          <Text weight="black" className="text-base" style={{ color: fg }}>
            {reward.title}
          </Text>
          {reward.subtitle ? (
            <Text weight="semibold" className="text-xs" style={{ color: fg, opacity: 0.85 }}>
              {reward.subtitle}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}
