import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/src/components/navigation/back-header';
import { Text } from '@/src/components/ui/text';

type AuthScreenProps = {
  title: string;
  description?: string;
  children: ReactNode;
  /** Pinned above the keyboard so the main button is always reachable without scrolling. */
  actions?: ReactNode;
  footer?: ReactNode;
};

/** Shared frame for the sign-in family: back arrow, mascot beside the title, scrolling form, pinned actions. */
export function AuthScreen({ title, description, children, actions, footer }: AuthScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="px-4 pt-1">
          <BackButton fallbackHref="/welcome" className="border-0" />
        </View>
        <ScrollView
          contentContainerClassName="grow px-5 pb-6 pt-2"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="w-full max-w-[27rem] self-center">
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <Text accessibilityRole="header" weight="black" className="text-[28px] leading-9">
                  {title}
                </Text>
                {description ? <Text className="mt-1 text-base leading-6 text-muted">{description}</Text> : null}
              </View>
              <Image
                source={require('@/assets/images/owl/hero-wave.png')}
                style={{ width: 96, height: 96 }}
                contentFit="contain"
                accessibilityIgnoresInvertColors
              />
            </View>
            <View className="mt-6 gap-4">{children}</View>
            {!actions && footer ? <View className="mt-6 items-center">{footer}</View> : null}
          </View>
        </ScrollView>
        {actions ? (
          <View className="gap-3 border-t-2 border-line bg-canvas px-5 pb-3 pt-3">
            <View className="w-full max-w-[27rem] gap-3 self-center">
              {actions}
              {footer ? <View className="items-center">{footer}</View> : null}
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
