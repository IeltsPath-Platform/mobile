import { Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-brand-50 px-5 pt-16">
      <Text className="text-3xl font-bold text-brand-900">Kế hoạch hôm nay</Text>
      <Text className="mt-2 text-base text-brand-700">
        Trợ lý học IELTS hằng ngày — base mobile sẵn sàng kết nối API.
      </Text>
      <View className="mt-8 rounded-2xl bg-white p-4">
        <Text className="text-lg font-semibold text-brand-900">Placeholder MVP</Text>
        <Text className="mt-1 text-sm text-brand-700">
          Onboarding, kế hoạch thích ứng, nghe 10 phút, vocab, streak sẽ thêm sau.
        </Text>
      </View>
    </View>
  );
}
