import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { AppState, Linking, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

/** Shown when the phone blocks this app's notifications: the switches below it would otherwise seem to work. */
export function PushPermissionNotice() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let active = true;
    const read = () => {
      void Notifications.getPermissionsAsync()
        .then((permission) => { if (active) setBlocked(!permission.granted); })
        .catch(() => undefined);
    };
    read();
    // Read again on return from the system settings.
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') read(); });
    return () => { active = false; subscription.remove(); };
  }, []);

  if (!blocked) return null;
  return (
    <View className="mb-4 gap-3 rounded-3xl p-4" style={{ backgroundColor: colors.warmSoft }}>
      <Text className="text-sm leading-5 text-ink">Điện thoại đang chặn thông báo của IELTSPath. Bật lại trong Cài đặt để nhận thông báo trên máy.</Text>
      <Button variant="secondary" label="Mở cài đặt" onPress={() => void Linking.openSettings()} />
    </View>
  );
}
