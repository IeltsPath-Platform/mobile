import { Text, View } from 'react-native';

export default function PracticeScreen() {
  return (
    <View className="flex-1 bg-white px-5 pt-16">
      <Text className="text-3xl font-bold text-brand-900">Luyện tập ngắn</Text>
      <Text className="mt-2 text-base text-brand-700">
        Bài luyện theo kỹ năng yếu, sổ tay lỗi sai, xem lại phản hồi AI.
      </Text>
    </View>
  );
}
