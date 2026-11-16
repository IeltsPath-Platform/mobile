import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Component, useEffect, type ReactNode } from 'react';
import { Platform, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { useUnread } from '@/src/features/community/use-unread';
import { colors } from '@/src/theme';

/** The badge is decoration: if it ever throws, hide it instead of taking the whole tab bar down. */
class BadgeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    if (__DEV__) console.warn('Unread badge failed', error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Red unread counter on the bell. It shares the ['community', 'unread'] cache with the notifications
 * screen (reading there clears it) and refreshes the moment a push arrives instead of waiting for the poll.
 */
function Badge({ borderColor }: { borderColor: string }) {
  const queryClient = useQueryClient();
  const count = useUnread().data?.count ?? 0;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: ['community', 'unread'] });
      void queryClient.invalidateQueries({ queryKey: ['community', 'notifications'] });
    });
    return () => subscription.remove();
  }, [queryClient]);

  if (count <= 0) return null;
  return (
    <View
      accessible
      accessibilityLabel={`${count} thông báo chưa đọc`}
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 5,
        right: 3,
        minWidth: 20,
        height: 20,
        paddingHorizontal: 5,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.danger,
        borderWidth: 2,
        borderColor,
      }}>
      <Text weight="black" maxFontSizeMultiplier={1} style={{ color: '#ffffff', fontSize: 10, lineHeight: 12 }}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

export function UnreadTabBadge({ borderColor }: { borderColor: string }) {
  return (
    <BadgeBoundary>
      <Badge borderColor={borderColor} />
    </BadgeBoundary>
  );
}
