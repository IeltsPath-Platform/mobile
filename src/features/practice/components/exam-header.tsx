import { Settings2, Timer, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LightStatusBar } from '@/src/components/ui/band-status-bar';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { useTicker } from '../hooks/use-ticker';
import { formatClock } from '../model/clock';

type ExamHeaderProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Seconds shown in the clock; null hides the clock. */
  seconds?: number | null;
  /** A live clock instead of `seconds`: re-read every second inside the header only, so the screen does not re-render. */
  readClock?: () => number;
  /** Counting down: the clock turns red near the end. */
  countdown?: boolean;
  /** Seconds left at which a countdown turns red: five minutes, less for a test that is itself that short. */
  urgentFrom?: number;
  onSettings?: () => void;
  right?: ReactNode;
  /** Header colour, normally the skill colour. Without it the header is a plain surface bar. */
  tint?: string;
  /** Share of the questions answered (0–1), drawn as a thin bar under the header. */
  progress?: number;
};

/** Icon colour for buttons placed in the header's `right` slot. */
export function headerIconColor(tint?: string) {
  return tint ? '#ffffff' : colors.muted;
}

/** Top bar of every test screen: close, title, clock, display settings and the answered progress. */
export function ExamHeader({ title, subtitle, onClose, seconds = null, readClock, countdown = false, urgentFrom = 300, onSettings, right, tint, progress }: ExamHeaderProps) {
  const insets = useSafeAreaInsets();
  const onTint = Boolean(tint);
  const fg = onTint ? '#ffffff' : colors.ink;
  const icon = headerIconColor(tint);
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: tint ?? colors.surface, borderBottomWidth: onTint ? 0 : 1, borderBottomColor: colors.line }}>
      {onTint ? <LightStatusBar /> : null}
      <View className="min-h-[56px] flex-row items-center gap-1 px-2">
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Thoát bài làm" hitSlop={8} className="h-11 w-11 items-center justify-center rounded-full active:opacity-70">
          <X size={22} color={icon} strokeWidth={2.4} />
        </Pressable>
        <View className="min-w-0 flex-1 px-1">
          <Text accessibilityRole="header" numberOfLines={1} weight="black" className="text-base" style={{ color: fg }}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} weight="bold" className="text-[11px] uppercase tracking-wider" style={{ color: onTint ? 'rgba(255,255,255,0.8)' : colors.muted }}>{subtitle}</Text> : null}
        </View>
        {readClock ? <LiveClock read={readClock} countdown={countdown} urgentFrom={urgentFrom} tint={tint} />
          : seconds !== null ? <ClockPill seconds={seconds} countdown={countdown} urgentFrom={urgentFrom} tint={tint} /> : null}
        {right}
        {onSettings ? (
          <Pressable onPress={onSettings} accessibilityRole="button" accessibilityLabel="Cài đặt hiển thị" hitSlop={8} className="h-11 w-10 items-center justify-center rounded-full active:opacity-70">
            <Settings2 size={20} color={icon} />
          </Pressable>
        ) : null}
      </View>
      {progress !== undefined ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 4, backgroundColor: onTint ? 'rgba(0,0,0,0.18)' : colors.line }}>
          <View style={{ height: 4, width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`, backgroundColor: onTint ? '#ffffff' : colors.accent, borderTopRightRadius: 2, borderBottomRightRadius: 2 }} />
        </View>
      ) : null}
    </View>
  );
}

function LiveClock({ read, countdown, urgentFrom, tint }: { read: () => number; countdown: boolean; urgentFrom: number; tint?: string }) {
  const seconds = useTicker(read);
  return <ClockPill seconds={seconds} countdown={countdown} urgentFrom={urgentFrom} tint={tint} />;
}

function ClockPill({ seconds, countdown, urgentFrom, tint }: { seconds: number; countdown: boolean; urgentFrom: number; tint?: string }) {
  const urgent = countdown && seconds <= urgentFrom;
  const onTint = Boolean(tint);
  return (
    <View
      accessibilityRole="timer"
      accessibilityLabel={countdown ? `Còn ${formatClock(seconds)}` : `Đã làm ${formatClock(seconds)}`}
      className="mx-1 flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
      style={{ backgroundColor: urgent ? colors.danger : onTint ? '#ffffff' : colors.canvas }}>
      <Timer size={15} color={urgent ? '#ffffff' : tint ?? colors.muted} strokeWidth={2.4} />
      <Text weight="black" className="text-sm" style={{ color: urgent ? '#ffffff' : tint ?? colors.ink, fontVariant: ['tabular-nums'] }}>{formatClock(seconds)}</Text>
    </View>
  );
}
