import { Text, View } from 'react-native';

export default function ProfileScreen() {
  return (
    <View className="flex-1 bg-white px-5 pt-16">
      <Text className="text-3xl font-bold text-brand-900">Tiến độ</Text>
      <Text className="mt-2 text-base text-brand-700">
        Dashboard mạnh/yếu theo kỹ năng, streak, hồ sơ mục tiêu band.
      </Text>
    </View>
  );
}
