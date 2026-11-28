import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronRight, Target } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { placementApi } from './api';

/** Home card leading to the placement test: an invitation before the first one, the latest band afterwards. */
export function PlacementEntryCard() {
  const options = useQuery({ queryKey: ['placement', 'options'], queryFn: ({ signal }) => placementApi.options(signal), staleTime: 60_000, retry: 1 });
  if (!options.data) return null;
  const { hasPlacement, currentBand, openAssignment } = options.data;
  const title = openAssignment
    ? 'Làm tiếp bài kiểm tra'
    : hasPlacement && currentBand != null ? `Trình độ: band ${currentBand.toFixed(1)}` : 'Kiểm tra trình độ miễn phí';
  const detail = openAssignment
    ? 'Câu trả lời đã làm vẫn được giữ'
    : hasPlacement ? 'Làm lại để cập nhật band của bạn' : 'Khoảng 40 phút, đủ 4 kỹ năng';
  return (
    <Pressable
      onPress={() => router.push('/placement' as never)}
      accessibilityRole="button"
      className="mt-4 flex-row items-center gap-3 rounded-3xl bg-surface p-4 active:opacity-80"
      style={{ borderWidth: 1.5, borderColor: colors.line }}>
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft">
        <Target size={22} color={colors.accentDeep} />
      </View>
      <View className="flex-1">
        <Text weight="extrabold" className="text-base">
          {title}
        </Text>
        <Text className="text-[13px] leading-5 text-muted">{detail}</Text>
      </View>
      <ChevronRight size={20} color={colors.muted} />
    </Pressable>
  );
}
