import { router } from 'expo-router';
import { Flame } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { SkillCard } from '@/src/features/practice/components/skill-card';
import { skills } from '@/src/features/practice/skills';
import { colors } from '@/src/theme';

export default function HomeScreen() {
  const { data: user } = useCurrentUser();
  const firstName = user?.fullName.trim().split(/\s+/).pop();

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="px-5 pb-10 pt-5">
      <Text weight="bold" className="text-xs uppercase tracking-widest text-accent-deep">
        Kế hoạch hôm nay
      </Text>
      <Text weight="black" className="mt-1.5 text-3xl leading-10" style={{ letterSpacing: -0.8 }}>
        {firstName ? `Chào ${firstName}, sẵn sàng luyện chưa?` : 'Sẵn sàng luyện chưa?'}
      </Text>
      <Text className="mt-2 text-base leading-6 text-muted">
        Làm đề, xem lời giải, lưu từ và theo dõi band — mỗi ngày một bước.
      </Text>

      <Card className="mt-6 bg-tint">
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft">
            <Flame size={24} color={colors.accentWarm} />
          </View>
          <View className="flex-1">
            <Text weight="extrabold" className="text-lg">
              Chuỗi ngày học
            </Text>
            <Text className="text-sm text-muted">Hoàn thành một bài luyện để giữ streak.</Text>
          </View>
        </View>
        <Button className="mt-4" label="Bắt đầu luyện miễn phí" onPress={() => router.push('/practice')} />
      </Card>

      <Text weight="extrabold" className="mb-3 mt-8 text-xl">
        Luyện đề theo kỹ năng
      </Text>
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {skills.map((skill) => (
          <SkillCard key={skill.key} skill={skill} className="w-[48.5%]" />
        ))}
      </View>
    </ScrollView>
  );
}
