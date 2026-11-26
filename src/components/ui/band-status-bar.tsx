import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Light status-bar icons for a screen whose top is a coloured header. Screens under a pushed one stay
 * mounted, so only the focused screen may decide the icon colour.
 */
export function LightStatusBar() {
  return useIsFocused() ? <StatusBar style="light" /> : null;
}

/**
 * Fixed strip of the header colour behind the status bar, for screens whose coloured header scrolls away:
 * without it the content runs under the clock. Render it after the scrolling content, at the screen root.
 */
export function StatusBarStrip({ color }: { color: string }) {
  const { top } = useSafeAreaInsets();
  return <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: top, backgroundColor: color }} />;
}
