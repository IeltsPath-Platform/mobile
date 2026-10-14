import type { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/src/components/ui/text';

type AuthScreenProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthScreen({ title, description, children, footer }: AuthScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="grow px-5 pb-8 pt-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="w-full max-w-[27rem] self-center">
            <Image
              source={require('@/assets/images/mascot.png')}
              style={{ width: 88, height: 88 }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <Text weight="black" className="mt-3 text-3xl leading-9" style={{ letterSpacing: -0.6 }}>
              {title}
            </Text>
            {description ? <Text className="mt-1 text-sm text-muted">{description}</Text> : null}
            <View className="mt-6 gap-4">{children}</View>
            {footer ? <View className="mt-6 items-center">{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

