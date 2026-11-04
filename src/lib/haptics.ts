import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Tactile feedback is best-effort: it must never throw or block an interaction. */
function safe(run: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  void run().catch(() => undefined);
}

export const haptics = {
  /** Light tick for toggles such as like / save / follow. */
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Stronger pulse when a press-and-hold gesture activates. */
  hold: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Selection change while sliding across options or picking an answer. */
  select: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
