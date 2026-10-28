import { BookOpenCheck, House, Layers, UserRound, Users } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';

import { Text } from '@/src/components/ui/text';
import { colors, spacing, touchTarget } from '@/src/theme';

const tabs = {
  index: { label: 'Hôm nay', Icon: House },
  flashcards: { label: 'Thẻ từ', Icon: BookOpenCheck },
  practice: { label: 'Luyện', Icon: Layers },
  community: { label: 'Cộng đồng', Icon: Users },
  account: { label: 'Hồ sơ', Icon: UserRound },
};

export function ColorfulTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingTop: spacing.sm,
        paddingBottom: Math.max(insets.bottom, spacing.sm),
        paddingHorizontal: spacing.xs,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.line,
      }}>
      {state.routes
        .filter((route) => route.name in tabs)
        .map((route) => {
          const { label, Icon } = tabs[route.name as keyof typeof tabs];
          const focused = state.routes[state.index]?.key === route.key;
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (event.defaultPrevented) return;

            if (!focused) navigateToTab(route.key);
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
                minHeight: touchTarget + 12,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 18,
              }}>
              <View
                style={{
                  width: 52,
                  height: 30,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 15,
                  backgroundColor: focused ? colors.accentSoft : 'transparent',
                }}>
                <Icon size={21} color={focused ? colors.accentDeep : colors.muted} strokeWidth={focused ? 2.3 : 1.8} />
              </View>
              <Text
                weight={focused ? 'bold' : 'medium'}
                style={{ fontSize: 10, marginTop: 3, color: focused ? colors.accentDeep : colors.muted }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
    </View>
  );
}
