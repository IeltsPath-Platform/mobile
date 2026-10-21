import { Bell, House, Layers, UserRound, Users } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { Text } from '@/src/components/ui/text';
import { useUnread } from '@/src/features/community/use-unread';
import { colors, spacing, touchTarget } from '@/src/theme';

export type ColorfulTabBarProps = {
  state: { index: number; routes: { key: string; name: string; params?: object }[] };
  descriptors: Record<string, { options: { title?: string; tabBarAccessibilityLabel?: string } }>;
  navigation: {
    emit: (event: { type: string; target?: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

const tabs = {
  index: { label: 'Hôm nay', Icon: House },
  practice: { label: 'Luyện', Icon: Layers },
  community: { label: 'Cộng đồng', Icon: Users },
  notifications: { label: 'Thông báo', Icon: Bell },
  account: { label: 'Hồ sơ', Icon: UserRound },
};

export function ColorfulTabBar({ state, navigation }: ColorfulTabBarProps) {
  const insets = useSafeAreaInsets();
  const unread = useUnread();
  const queryClient = useQueryClient();
  const unreadCount = unread.data?.count ?? 0;

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
          const hasUnread = route.name === 'notifications' && unreadCount > 0;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (event.defaultPrevented) return;

            void queryClient.invalidateQueries({ queryKey: ['community', 'unread'] });
            if (route.name === 'notifications') {
              void queryClient.invalidateQueries({ queryKey: ['community', 'notifications'] });
            }
            if (!focused) navigation.navigate(route.name, route.params);
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={`${label}${hasUnread ? `, ${unreadCount} chưa đọc` : ''}`}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
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
                {hasUnread ? (
                  <View
                    style={{
                      position: 'absolute',
                      right: 5,
                      top: 0,
                      minWidth: 17,
                      paddingHorizontal: 4,
                      borderRadius: 10,
                      backgroundColor: colors.danger,
                    }}>
                    <Text weight="bold" style={{ color: '#fff', fontSize: 9, textAlign: 'center' }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                ) : null}
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
