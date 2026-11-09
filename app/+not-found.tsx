import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';

export default function NotFoundScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-canvas px-6">
      <Text weight="extrabold" className="text-center text-xl">
        Trang này không tồn tại
      </Text>
      <Button label="Về trang chủ" onPress={() => router.replace('/')} />
    </View>
  );
}
