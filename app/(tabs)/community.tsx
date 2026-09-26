import { MessagesSquare, Swords, UsersRound } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

const highlights = [
  { Icon: Swords, label: 'Thử thách', color: colors.accentWarm },
  { Icon: UsersRound, label: 'Nhóm', color: colors.skill.listening },
  { Icon: MessagesSquare, label: 'Hỏi đáp', color: colors.skill.writing },
];

export default function CommunityScreen() {
  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="px-5 pb-12 pt-8">
      <View className="flex-row flex-wrap justify-between gap-y-4">
        {highlights.map(({ Icon, label, color }) => (
          <View
            key={label}
            accessibilityLabel={`${label}, sắp có`}
            className="w-[30%] items-center rounded-3xl border border-line border-b-4 border-b-edge bg-surface px-2 py-5">
            <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: `${color}22` }}>
              <Icon size={28} color={color} />
            </View>
            <Text weight="extrabold" className="mt-3 text-center text-xs" style={{ color }}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
