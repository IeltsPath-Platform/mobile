import { ScrollView, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { SkillCard } from '@/src/features/practice/components/skill-card';
import { fullTest, skills } from '@/src/features/practice/skills';

export default function PracticeScreen() {
  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="px-5 pb-10 pt-5">
      <Text weight="bold" className="text-xs uppercase tracking-widest text-accent-deep">
        Luyện đề
      </Text>
      <Text weight="black" className="mt-1.5 text-3xl leading-10" style={{ letterSpacing: -0.8 }}>
        Chọn kỹ năng để bắt đầu
      </Text>
      <Text className="mt-2 text-base leading-6 text-muted">
        Kho đề bốn kỹ năng, mô phỏng thi máy và feedback rõ ràng.
      </Text>

      <View className="mt-6 gap-3">
        {[...skills, fullTest].map((skill) => (
          <SkillCard key={skill.key} skill={skill} badge="Sắp ra mắt" />
        ))}
      </View>
    </ScrollView>
  );
}
