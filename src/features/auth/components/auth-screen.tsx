import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/src/components/ui/brand-logo';
import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';

type AuthScreenProps = {
  eyebrow: string;
  title: string;
  description?: string;
  showIntro?: boolean;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthScreen({ eyebrow, title, description, showIntro = false, children, footer }: AuthScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="grow px-5 pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="w-full max-w-[27rem] self-center">
            <BrandLogo />

            {showIntro ? (
              <View className="mt-6 rounded-3xl border border-accent/20 bg-tint p-5">
                <Text weight="bold" className="text-xs uppercase tracking-widest text-accent-deep">
                  Luyện tập có định hướng
                </Text>
                <Text weight="black" className="mt-2 text-2xl leading-8" style={{ letterSpacing: -0.5 }}>
                  Từng bài luyện đưa bạn gần band mục tiêu hơn.
                </Text>
                <Text className="mt-2 text-sm leading-5 text-muted">
                  Kho đề bốn kỹ năng, mô phỏng thi máy và feedback rõ ràng để biết chính xác bước tiếp theo.
                </Text>
              </View>
            ) : null}

            <Card className="mt-6">
              <Text weight="bold" className="text-xs uppercase tracking-widest text-accent-deep">
                {eyebrow}
              </Text>
              <Text weight="extrabold" className="mt-1.5 text-2xl leading-8" style={{ letterSpacing: -0.4 }}>
                {title}
              </Text>
              {description ? <Text className="mt-1.5 text-sm leading-5 text-muted">{description}</Text> : null}
              <View className="mt-5 gap-4">{children}</View>
            </Card>

            {footer ? <View className="mt-5 items-center">{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
