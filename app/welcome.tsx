import { router } from 'expo-router';
import { Image, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/src/components/ui/text';
import { useOnboarding } from '@/src/features/onboarding/use-onboarding';
import { AUTH_ENABLED } from '@/src/lib/env';

const BRAND = '#ff7624';

export default function WelcomeScreen() {
  const { onboarded } = useOnboarding();

  const start = () => {
    if (!onboarded) {
      router.push('/onboarding');
      return;
    }
    router.push(AUTH_ENABLED ? '/register' : '/');
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: BRAND }} edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-8">
        <Image
          source={require('@/assets/images/splash-mascot.png')}
          style={{ width: 300, height: 300, backgroundColor: 'transparent' }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <Text weight="black" className="mt-3 text-5xl leading-[56px]" style={{ color: '#ffffff', letterSpacing: -1 }}>
          ieltspath
        </Text>
        <Text className="mt-2 text-center text-base" style={{ color: 'rgba(255, 255, 255, 0.92)' }}>
          Học từng bước. Giữ nhịp mỗi ngày.
        </Text>
      </View>

      <View className="gap-3 px-6 pb-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bắt đầu"
          onPress={start}
          className="h-14 items-center justify-center rounded-2xl bg-white active:opacity-90">
          <Text weight="extrabold" className="text-base" style={{ color: BRAND }}>
            Bắt đầu
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tôi đã có tài khoản"
          onPress={() => router.push('/login')}
          className="h-12 items-center justify-center">
          <Text weight="extrabold" className="text-base" style={{ color: '#ffffff' }}>
            Tôi đã có tài khoản
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
