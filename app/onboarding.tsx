import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/src/components/ui/text';
import { useOnboarding, type OnboardingAnswers } from '@/src/features/onboarding/use-onboarding';
import { AUTH_ENABLED } from '@/src/lib/env';
import { colors } from '@/src/theme';

const STEPS: { key: keyof OnboardingAnswers; prompt: string; options: string[] }[] = [
  { key: 'band', prompt: 'Band mục tiêu?', options: ['5.5', '6.0', '6.5', '7.0', '7.5+'] },
  { key: 'skill', prompt: 'Kỹ năng muốn kéo lên trước?', options: ['Listening', 'Reading', 'Writing', 'Speaking'] },
  { key: 'minutes', prompt: 'Mỗi ngày bạn học bao lâu?', options: ['5 phút', '10 phút', '15 phút', '20 phút'] },
  { key: 'goal', prompt: 'Bạn học IELTS để làm gì?', options: ['Du học', 'Việc làm', 'Tốt nghiệp', 'Tự tin hơn'] },
  { key: 'experience', prompt: 'Bạn đã thi IELTS chưa?', options: ['Chưa thi', 'Một lần', 'Nhiều lần'] },
  { key: 'reminder', prompt: 'Nhắc bạn học lúc nào?', options: ['Buổi sáng', 'Buổi tối', 'Không nhắc'] },
];

const EMPTY: OnboardingAnswers = {
  band: '',
  skill: '',
  minutes: '',
  goal: '',
  experience: '',
  reminder: '',
};

export default function OnboardingScreen() {
  const { complete } = useOnboarding();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(EMPTY);
  const [saving, setSaving] = useState(false);
  const current = STEPS[step];
  const selected = answers[current.key];
  const last = step === STEPS.length - 1;

  const choose = (option: string) => {
    setAnswers((prev) => ({ ...prev, [current.key]: option }));
  };

  const next = async () => {
    if (!selected || saving) return;
    if (!last) {
      setStep((value) => value + 1);
      return;
    }
    setSaving(true);
    try {
      await complete(answers);
      if (AUTH_ENABLED) router.replace('/register');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
      <View className="px-5 pt-3">
        <View className="h-2 overflow-hidden rounded-full bg-line">
          <View className="h-full rounded-full bg-accent" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </View>
        <Text className="mt-2 text-xs text-muted">
          {step + 1}/{STEPS.length}
        </Text>
      </View>

      <ScrollView contentContainerClassName="grow px-5 pb-6 pt-8" showsVerticalScrollIndicator={false}>
        <Text weight="black" className="text-3xl leading-10" style={{ letterSpacing: -0.6 }}>
          {current.prompt}
        </Text>
        <View className="mt-6 gap-3">
          {current.options.map((option) => {
            const active = selected === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => choose(option)}
                className="min-h-16 justify-center rounded-2xl border border-b-4 px-4"
                style={{
                  borderColor: active ? colors.accent : colors.line,
                  borderBottomColor: active ? colors.accentEdge : colors.edge,
                  backgroundColor: active ? colors.accentSoft : colors.surface,
                }}>
                <Text weight="extrabold" className="text-lg" style={{ color: active ? colors.accentDeep : colors.ink }}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="flex-row gap-3 px-5 pb-4">
        {step > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => setStep((value) => value - 1)}
            className="h-14 flex-1 items-center justify-center rounded-2xl border border-line bg-surface">
            <Text weight="extrabold" className="text-base">
              Quay lại
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={last ? 'Xong' : 'Tiếp tục'}
          disabled={!selected || saving}
          onPress={() => void next()}
          className="h-14 flex-[2] items-center justify-center rounded-2xl bg-accent"
          style={{ opacity: selected && !saving ? 1 : 0.45 }}>
          <Text weight="extrabold" className="text-base text-white">
            {last ? 'Xong' : 'Tiếp tục'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
