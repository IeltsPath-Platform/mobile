import { Tabs } from 'expo-router';
import { ColorfulTabBar, type ColorfulTabBarProps } from '@/src/components/navigation/colorful-tab-bar';
import { colors } from '@/src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return <Tabs tabBar={(props) => <ColorfulTabBar {...(props as unknown as ColorfulTabBarProps)} />} screenOptions={{
    sceneStyle: { backgroundColor: colors.canvas, paddingTop: insets.top }, headerShown: false,
  }}>
    <Tabs.Screen name="index" options={{ title: 'Hôm nay' }} />
    <Tabs.Screen name="flashcards" options={{ title: 'Flashcards' }} />
    <Tabs.Screen name="practice" options={{ title: 'Luyện' }} />
    <Tabs.Screen name="community" options={{ title: 'Cộng đồng' }} />
    <Tabs.Screen name="notifications" options={{ title: 'Thông báo' }} />
    <Tabs.Screen name="account" options={{ title: 'Hồ sơ' }} />
    <Tabs.Screen name="profile" options={{ href: null }} />
  </Tabs>;
}
