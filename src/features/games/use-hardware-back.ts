import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

/**
 * Makes Android's Back button do what the screen's own close button does while `active`. In a live match Back
 * would otherwise leave without asking, and the clock keeps running against the player.
 */
export function useHardwareBack(onBack: () => void, active: boolean) {
  useFocusEffect(
    useCallback(() => {
      if (!active) return;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        onBack();
        return true;
      });
      return () => subscription.remove();
    }, [onBack, active]),
  );
}
