import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';

const GOOGLE_MESSAGE = 'Đăng nhập Google sẽ mở khi BE sẵn sàng.';

export function GoogleSignInButton() {
  const [note, setNote] = useState<string | null>(null);

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-line" />
        <Text className="text-xs text-muted">hoặc</Text>
        <View className="h-px flex-1 bg-line" />
      </View>
      <Button variant="secondary" label="Đăng nhập với Google" onPress={() => setNote(GOOGLE_MESSAGE)} />
      {note ? <Text className="text-center text-sm leading-5 text-muted">{note}</Text> : null}
    </View>
  );
}
