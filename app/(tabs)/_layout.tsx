import { Tabs } from 'expo-router';
import { BookOpen, ChartLine, House, Users } from 'lucide-react-native';

import { BrandLogo } from '@/src/components/ui/brand-logo';
import { colors, fonts } from '@/src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitle: () => <BrandLogo size="sm" />,
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
        tabBarActiveTintColor: colors.accentDeep,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        sceneStyle: { backgroundColor: colors.canvas },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Hôm nay', tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="practice"
        options={{ title: 'Luyện đề', tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="community"
        options={{ title: 'Cộng đồng', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Tiến độ', tabBarIcon: ({ color, size }) => <ChartLine color={color} size={size} /> }}
      />
    </Tabs>
  );
}
