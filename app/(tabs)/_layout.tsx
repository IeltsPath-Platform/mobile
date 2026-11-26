import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabReselectProvider } from '@/src/components/navigation/tab-reselect-context';
import { ColorfulTabBar } from '@/src/components/navigation/colorful-tab-bar';
import { colors } from '@/src/theme';
import { themedScreenLayout, useTheme } from '@/src/theme/app-theme';

/** A crash in one screen of this group shows a retry screen here instead of taking down the whole app. */
export { RouteErrorBoundary as ErrorBoundary } from '@/src/components/ui/route-error-boundary';

export default function TabLayout() {
  useTheme();
  const insets = useSafeAreaInsets();

  return (
    <TabReselectProvider>
      <Tabs
        screenLayout={themedScreenLayout}
        tabBar={(props) => <ColorfulTabBar {...props} />}
        screenOptions={{
          sceneStyle: { backgroundColor: colors.canvas, paddingTop: insets.top },
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: { position: 'absolute', backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Hôm nay', sceneStyle: { backgroundColor: colors.canvas, paddingTop: 0 } }} />
        <Tabs.Screen name="flashcards" options={{ title: 'Flashcards' }} />
        <Tabs.Screen name="practice" options={{ title: 'Trò chơi' }} />
        <Tabs.Screen name="community" options={{ title: 'Cộng đồng', sceneStyle: { backgroundColor: colors.canvas, paddingTop: 0 } }} />
        <Tabs.Screen name="notifications" options={{ title: 'Thông báo' }} />
        <Tabs.Screen name="account" options={{ title: 'Hồ sơ' }} />
      </Tabs>
    </TabReselectProvider>
  );
}
