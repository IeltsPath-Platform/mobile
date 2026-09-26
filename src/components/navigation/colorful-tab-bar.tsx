import { BookOpen, ChartLine, House, Users } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

type TabRoute = {
  key: string;
  name: string;
  params?: object;
};

type TabDescriptor = {
  options: {
    title?: string;
    tabBarLabel?: string | ((props: { focused: boolean; color: string; position: string; children: string }) => ReactNode);
    tabBarAccessibilityLabel?: string;
  };
};

export type ColorfulTabBarProps = {
  state: {
    index: number;
    routes: TabRoute[];
  };
  descriptors: Record<string, TabDescriptor>;
  navigation: {
    emit: (event: { type: string; target?: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

const TAB_META: Record<
  string,
  {
    label: string;
    short: string;
    color: string;
    soft: string;
    Icon: typeof House;
  }
> = {
  index: {
    label: 'Hôm nay',
    short: 'Hôm nay',
    color: '#ea580c',
    soft: '#ffedd5',
    Icon: House,
  },
  practice: {
    label: 'Luyện đề',
    short: 'Luyện',
    color: '#0284c7',
    soft: '#e0f2fe',
    Icon: BookOpen,
  },
  community: {
    label: 'Cộng đồng',
    short: 'Cộng đồng',
    color: '#e11d48',
    soft: '#ffe4e6',
    Icon: Users,
  },
  profile: {
    label: 'Tiến độ',
    short: 'Tiến độ',
    color: '#059669',
    soft: '#d1fae5',
    Icon: ChartLine,
  },
};

function TabItem({
  focused,
  label,
  color,
  soft,
  Icon,
  onPress,
  onLongPress,
  accessibilityLabel,
}: {
  focused: boolean;
  label: string;
  color: string;
  soft: string;
  Icon: typeof House;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel: string;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        scale.value = withSpring(0.92, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 260 });
      }}
      hitSlop={8}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
      <Animated.View style={animatedStyle}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: focused ? 6 : 0,
            minWidth: 44,
            height: 36,
            paddingHorizontal: focused ? 12 : 10,
            borderRadius: 18,
            backgroundColor: focused ? soft : 'transparent',
          }}>
          <Icon size={20} color={focused ? color : colors.muted} strokeWidth={focused ? 2.5 : 2} />
          {focused ? (
            <Text weight="extrabold" style={{ fontSize: 12, color, letterSpacing: -0.2 }} numberOfLines={1}>
              {label}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function ColorfulTabBar({ state, descriptors, navigation }: ColorfulTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        backgroundColor: 'transparent',
        paddingBottom: Math.max(insets.bottom, 8),
        paddingTop: 4,
        paddingHorizontal: 16,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 52,
          backgroundColor: colors.surface,
          borderRadius: 26,
          borderWidth: 1,
          borderColor: 'rgba(231, 226, 215, 0.95)',
          paddingHorizontal: 4,
          shadowColor: '#ea580c',
          shadowOpacity: 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = TAB_META[route.name] ?? {
            label: descriptors[route.key]?.options.title ?? route.name,
            short: descriptors[route.key]?.options.title ?? route.name,
            color: colors.accentDeep,
            soft: colors.accentSoft,
            Icon: House,
          };
          const { options } = descriptors[route.key];

          return (
            <TabItem
              key={route.key}
              focused={focused}
              label={meta.short}
              color={meta.color}
              soft={meta.soft}
              Icon={meta.Icon}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? meta.label}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() => {
                navigation.emit({ type: 'tabLongPress', target: route.key });
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
