import { router, usePreventRemove } from 'expo-router';
import { Check, Send } from 'lucide-react-native';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

/** Horizontal section / passage switcher with per-section progress. */
export function SectionTabs({ labels, progress, activeIndex, onSelect, tint, countLabel = 'đã làm' }: { labels: string[]; progress: { answered: number; total: number }[]; activeIndex: number; onSelect: (index: number) => void; tint: string; /** What the count means, read by screen readers ("đã làm", "đúng"). */ countLabel?: string }) {
  if (labels.length <= 1) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0 border-b border-line bg-surface" contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
      {labels.map((label, index) => {
        const active = index === activeIndex;
        const item = progress[index] ?? { answered: 0, total: 0 };
        const done = item.total > 0 && item.answered === item.total;
        const share = item.total ? item.answered / item.total : 0;
        return (
          <Pressable key={label} onPress={() => onSelect(index)} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={`${label}, ${countLabel} ${item.answered} trên ${item.total}`} className="min-h-11 justify-center rounded-2xl px-3.5 py-1.5 active:opacity-80" style={{ minWidth: 92, backgroundColor: active ? tint : colors.canvas, borderWidth: 1.5, borderColor: active ? tint : colors.line }}>
            <View className="flex-row items-center justify-between gap-2">
              <Text weight="extrabold" className="text-[13px]" style={{ color: active ? '#ffffff' : colors.ink }}>{label}</Text>
              {done ? <Check size={14} color={active ? '#ffffff' : colors.success} strokeWidth={3} />
                : <Text weight="bold" className="text-[11px]" style={{ color: active ? 'rgba(255,255,255,0.85)' : colors.muted, fontVariant: ['tabular-nums'] }}>{item.answered}/{item.total}</Text>}
            </View>
            <View style={{ marginTop: 5, height: 3, borderRadius: 2, backgroundColor: active ? 'rgba(255,255,255,0.3)' : colors.line, overflow: 'hidden' }}>
              <View style={{ height: 3, width: `${share * 100}%`, backgroundColor: active ? '#ffffff' : done ? colors.success : tint }} />
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Bottom bar of a test in one row: the question strip, then a submit pill, above the home indicator. */
export function TestFooter({ children, onSubmit, unanswered, submitting, tint = colors.accent }: { children: ReactNode; onSubmit: () => void; unanswered: number; submitting: boolean; tint?: string }) {
  const insets = useSafeAreaInsets();
  const ready = unanswered === 0;
  return (
    <View className="flex-row items-center border-t border-line bg-surface pl-2 pr-3" style={{ paddingTop: 8, paddingBottom: Math.max(insets.bottom, 10) }}>
      <View className="min-w-0 flex-1">{children}</View>
      <Pressable
        onPress={onSubmit}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel={unanswered ? `Nộp bài, còn ${unanswered} câu chưa làm` : 'Nộp bài'}
        className="ml-2 h-11 flex-row items-center gap-1.5 rounded-full px-4 active:opacity-80"
        style={{ backgroundColor: ready ? colors.success : tint, opacity: submitting ? 0.6 : 1, borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.22)' }}>
        <Send size={16} color="#ffffff" strokeWidth={2.4} />
        <Text weight="black" className="text-sm" style={{ color: '#ffffff' }}>Nộp</Text>
        {!ready ? (
          <View className="ml-0.5 min-w-5 items-center rounded-full px-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
            <Text weight="black" className="text-[11px]" style={{ color: '#ffffff' }}>{unanswered}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

/**
 * Lifts the content above the keyboard. Both platforms need it: Expo apps are edge-to-edge on Android, so the window
 * no longer resizes for the keyboard and a view without a `behavior` stays under it.
 */
export function KeyboardShell({ children }: { children: ReactNode }) {
  return <KeyboardAvoidingView className="flex-1" behavior="padding">{children}</KeyboardAvoidingView>;
}

/**
 * Leaving a test in progress asks first. Answers are already saved, so leaving loses nothing; the alert says so.
 * Returns a function that lifts the guard (used before navigating to the result).
 */
export function useLeaveTestGuard(active: boolean, message = 'Đáp án đã được lưu. Bạn có thể quay lại làm tiếp từ tab Luyện tập.', title = 'Tạm rời bài làm?') {
  // The alert's button lifts the guard it belongs to, which only exists once the hook has returned: reach it through a ref.
  const disable = useRef<() => void>(() => undefined);
  const liftGuard = usePreventRemove(active, ({ repeat }) => {
    Alert.alert(title, message, [
      { text: 'Làm tiếp', style: 'cancel' },
      { text: 'Rời bài', style: 'destructive', onPress: () => { disable.current(); repeat(); } },
    ]);
  });
  useLayoutEffect(() => { disable.current = liftGuard; });
  return liftGuard;
}

export function closeTest(fallback: string) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as never);
}

/** Leaves a finished test for its catalog. The catalog is usually already in the stack, so pop back to it instead of stacking a second copy. */
export function leaveToCatalog(catalog: string) {
  router.dismissTo(catalog as never);
}
