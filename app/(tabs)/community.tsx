import { MessagesSquare } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

export default function CommunityScreen() {
  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="px-5 pb-10 pt-5">
      <Text weight="bold" className="text-xs uppercase tracking-widest text-accent-deep">
        Cộng đồng
      </Text>
      <Text weight="black" className="mt-1.5 text-3xl leading-10" style={{ letterSpacing: -0.8 }}>
        Học cùng nhau, tiến nhanh hơn
      </Text>

      <Card className="mt-6 items-center py-8">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
          <MessagesSquare size={28} color={colors.accentDeep} />
        </View>
        <Text weight="extrabold" className="mt-4 text-lg">
          Sắp ra mắt
        </Text>
        <Text className="mt-1 text-center text-sm leading-5 text-muted">
          Bảng tin, nhóm học, thử thách tuần và bảng xếp hạng.
        </Text>
      </Card>
    </ScrollView>
  );
}
