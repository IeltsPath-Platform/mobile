import { Tabs } from 'expo-router';
import { Flame, Zap } from 'lucide-react-native';
import { View } from 'react-native';

import { ColorfulTabBar, type ColorfulTabBarProps } from '@/src/components/navigation/colorful-tab-bar';
import { BrandLogo } from '@/src/components/ui/brand-logo';
import { Text } from '@/src/components/ui/text';
import { learnerStats } from '@/src/features/practice/path';
import { colors } from '@/src/theme';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <ColorfulTabBar {...(props as unknown as ColorfulTabBarProps)} />}
      screenOptions={{
        headerTitle: () => (
          <View className="w-full flex-row items-center justify-between pr-1">
            <BrandLogo size="sm" />
            <View className="flex-row items-center gap-2">
              <View className="flex-row items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1">
                <Flame size={14} color={colors.accentWarm} fill={colors.accentWarm} />
                <Text weight="extrabold" className="text-xs text-accent-deep">
                  {learnerStats.streak}
                </Text>
              </View>
              <View className="flex-row items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1">
                <Zap size={14} color={colors.xpDeep} fill={colors.xp} />
                <Text weight="extrabold" className="text-xs text-accent-deep">
                  {learnerStats.xp}
                </Text>
              </View>
            </View>
          </View>
        ),
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
        },
        sceneStyle: { backgroundColor: colors.canvas },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Hôm nay' }} />
      <Tabs.Screen name="practice" options={{ title: 'Luyện đề' }} />
      <Tabs.Screen name="community" options={{ title: 'Cộng đồng' }} />
      <Tabs.Screen name="profile" options={{ title: 'Tiến độ' }} />
    </Tabs>
  );
}
