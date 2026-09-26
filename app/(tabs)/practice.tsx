import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { fullTest, skills } from '@/src/features/practice/skills';

const skillProgress: Record<string, number> = {
  listening: 0.65,
  reading: 0.4,
  writing: 0.25,
  speaking: 0.1,
  full: 0,
};

export default function PracticeScreen() {
  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="px-5 pb-12 pt-5" showsVerticalScrollIndicator={false}>
      <View className="mt-2 flex-row flex-wrap justify-between gap-y-3">
        {[...skills, fullTest].map((skill) => {
          const progress = skillProgress[skill.key] ?? 0;
          const { Icon, color, label, description } = skill;
          return (
            <Pressable
              key={skill.key}
              accessibilityRole="button"
              accessibilityLabel={`${label}. ${description}. ${Math.round(progress * 100)} phần trăm`}
              onPress={() => router.push('/')}
              className="w-[48%] items-center rounded-3xl border border-line border-b-4 border-b-edge bg-surface px-3 py-5 active:translate-y-0.5">
              <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: `${color}22` }}>
                <Icon size={30} color={color} />
              </View>
              <View className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
                <View className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: color }} />
              </View>
              <Text weight="extrabold" className="mt-2 text-sm" style={{ color }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
