import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabReselectProvider } from '@/src/components/navigation/tab-reselect-context';
import { ColorfulTabBar } from '@/src/components/navigation/colorful-tab-bar';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

export default function TabLayout() {
  useTheme();
  const insets = useSafeAreaInsets();

  return (
    <TabReselectProvider>
      <Tabs
        tabBar={(props) => <ColorfulTabBar {...props} />}
        screenOptions={{
          sceneStyle: { backgroundColor: colors.canvas, paddingTop: insets.top },
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: { position: 'absolute', backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Hôm nay' }} />
        <Tabs.Screen name="flashcards" options={{ title: 'Flashcards' }} />
        <Tabs.Screen name="community" options={{ title: 'Cộng đồng', sceneStyle: { backgroundColor: colors.canvas, paddingTop: 0 } }} />
        <Tabs.Screen name="practice" options={{ title: 'Luyện' }} />
        <Tabs.Screen name="notifications" options={{ title: 'Thông báo' }} />
        <Tabs.Screen name="account" options={{ title: 'Hồ sơ' }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>
    </TabReselectProvider>
  );
}
