import { usePreventRemove } from 'expo-router';
import { useLayoutEffect, useRef } from 'react';
import { Alert } from 'react-native';

/**
 * Asks before a form with unsaved changes is left, by the Back button or the header. Call the returned
 * function once the changes are saved, so the screen's own `router.back()` is not questioned.
 */
export function useDiscardGuard(dirty: boolean) {
  const saved = useRef(false);
  const disable = useRef<() => void>(() => undefined);
  const lift = usePreventRemove(dirty, ({ repeat }) => {
    const leave = () => { disable.current(); repeat(); };
    if (saved.current) return leave();
    Alert.alert('Bỏ thay đổi?', 'Những gì bạn vừa sửa chưa được lưu.', [
      { text: 'Ở lại', style: 'cancel' },
      { text: 'Bỏ thay đổi', style: 'destructive', onPress: leave },
    ]);
  });
  useLayoutEffect(() => { disable.current = lift; });
  return () => { saved.current = true; };
}
