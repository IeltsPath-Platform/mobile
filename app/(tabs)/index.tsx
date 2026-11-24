import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { View, type ScrollViewInstance } from 'react-native';

import { useTabBarScrollHandler, useTabReselect } from '@/src/components/navigation/tab-reselect-context';
import { useAuth } from '@/src/features/auth/auth-provider';
import { PracticeHome } from '@/src/features/practice/home/practice-home';
import { useTheme } from '@/src/theme/app-theme';

/** The home tab: IELTS practice of the four skills. */
export default function HomeScreen() {
  useTheme();
  const { status, authEnabled } = useAuth();
  const signedIn = authEnabled && status === 'authenticated';
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const refreshPrimed = useRef(false);
  const handleTabBarScroll = useTabBarScrollHandler();

  // Tapping the tab again scrolls to the top; a second tap there refreshes.
  const refreshFromTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (!refreshPrimed.current) { refreshPrimed.current = true; return; }
    refreshPrimed.current = false;
    void queryClient.invalidateQueries({ queryKey: ['practice'] });
  }, [queryClient]);
  useTabReselect('index', refreshFromTop);

  return (
    <View className="flex-1 bg-canvas">
      <PracticeHome ref={scrollRef} signedIn={signedIn} onScroll={handleTabBarScroll} />
    </View>
  );
}
