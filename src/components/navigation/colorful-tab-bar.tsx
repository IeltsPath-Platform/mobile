import { Bell, BookOpenCheck, House, Layers, UserRound, Users } from 'lucide-react-native';
import { Animated, Pressable, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';

import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';
import { useNotifyTabReselect, useTabBarControls } from './tab-reselect-context';

const tabs = {
  index: { label: 'Hôm nay', Icon: House },
  flashcards: { label: 'Thẻ từ', Icon: BookOpenCheck },
  community: { label: 'Cộng đồng', Icon: Users },
  practice: { label: 'Luyện', Icon: Layers },
  notifications: { label: 'Thông báo', Icon: Bell },
  account: { label: 'Hồ sơ', Icon: UserRound },
};

export function ColorfulTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { isDark } = useTheme();
  const notifyReselect = useNotifyTabReselect();
  const { tabBarVisible, resetTabBar } = useTabBarControls();
  const insets = useSafeAreaInsets();
  const activeRouteKey = state.routes[state.index]?.key;
  const visibility = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    resetTabBar();
  }, [activeRouteKey, resetTabBar]);

  useEffect(() => {
    const animation = Animated.timing(visibility, {
      toValue: tabBarVisible ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [tabBarVisible, visibility]);

  return (
    <Animated.View
      pointerEvents={tabBarVisible ? 'box-none' : 'none'}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        paddingHorizontal: 12,
        paddingBottom: Math.max(insets.bottom, 10),
        backgroundColor: 'transparent',
        opacity: visibility.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        transform: [{ translateY: visibility.interpolate({ inputRange: [0, 1], outputRange: [0, 120] }) }],
      }}>
      <View
        style={{
          height: 66,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 6,
          borderRadius: 36,
          backgroundColor: isDark ? '#25292d' : '#ffffff',
          borderWidth: 1,
          borderColor: isDark ? '#3b4146' : '#e1e5e9',
          shadowColor: isDark ? '#000000' : '#17212b',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: isDark ? 0.3 : 0.14,
          shadowRadius: 10,
          elevation: 8,
        }}>
        {state.routes
          .filter((route) => route.name in tabs)
          .map((route) => {
            const { label, Icon } = tabs[route.name as keyof typeof tabs];
            const focused = state.routes[state.index]?.key === route.key;
            const onPress = () => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (event.defaultPrevented) return;
              if (focused) {
                haptics.tap();
                notifyReselect?.(route.name);
                return;
              }

              haptics.select();
              navigateToTab(route.key);
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
                onPress={onPress}
                onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
                style={{
                  flex: 1,
                  height: 54,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 30,
                }}>
                <View
                  style={{
                    width: '100%',
                    maxWidth: 58,
                    height: 54,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 30,
                    backgroundColor: focused ? (isDark ? '#41474c' : '#e9edf1') : 'transparent',
                  }}>
                  <Icon
                    size={25}
                    color={focused ? colors.ink : colors.muted}
                    strokeWidth={focused ? 2.6 : 2.1}
                  />
                </View>
              </Pressable>
            );
          })}
      </View>
    </Animated.View>
  );
}
