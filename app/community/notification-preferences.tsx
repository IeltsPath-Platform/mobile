import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronLeft, SlidersHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, View } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { communityApi } from '@/src/features/community/api';
import { colors } from '@/src/theme';

const readableName = (type: string) => type.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['community', 'notification-preferences'], queryFn: communityApi.preferences });
  const [busy, setBusy] = useState<string>();

  const update = async (eventType: string, enabled: boolean) => {
    setBusy(eventType);
    try {
      await communityApi.updatePreference(eventType, enabled);
      await queryClient.invalidateQueries({ queryKey: ['community', 'notification-preferences'] });
    } catch (error) {
      Alert.alert('Chưa thể lưu tuỳ chọn', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally { setBusy(undefined); }
  };

  return <View className="flex-1 bg-canvas">
    <View className="border-b border-line bg-white px-4 pb-5 pt-3">
      <Pressable onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full bg-slate-50" accessibilityLabel="Quay lại">
        <ChevronLeft size={21} color={colors.ink} />
      </Pressable>
      <View className="mt-4 flex-row items-center">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft"><SlidersHorizontal size={22} color={colors.accent} /></View>
        <View className="ml-3 flex-1"><Text weight="black" className="text-xl">Tuỳ chọn thông báo</Text><Text className="mt-1 text-sm text-muted">Chọn hoạt động bạn muốn nhận tin.</Text></View>
      </View>
    </View>
    <ScrollView contentContainerClassName="px-4 pb-10 pt-4">
      {query.isPending ? <View className="items-center py-16"><ActivityIndicator color={colors.accent} /><Text className="mt-3 text-sm text-muted">Đang tải tuỳ chọn…</Text></View>
        : query.isError ? <Pressable onPress={() => void query.refetch()} className="items-center rounded-3xl border border-line bg-white p-6"><Text weight="bold">Không tải được tuỳ chọn</Text><Text className="mt-2 text-sm text-accent">Chạm để thử lại</Text></Pressable>
        : query.data?.length ? <View className="overflow-hidden rounded-3xl border border-line bg-white">
          {query.data.map((item, index) => <View key={item.eventType} className={`min-h-[76px] flex-row items-center px-4 py-3 ${index ? 'border-t border-line' : ''}`}>
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent-soft"><SlidersHorizontal size={17} color={colors.accent} /></View>
            <View className="ml-3 flex-1 pr-3"><Text weight="semibold" className="text-sm">{readableName(item.eventType)}</Text><Text className="mt-1 text-xs text-muted">Thông báo về hoạt động này</Text></View>
            <Switch value={item.enabled} disabled={busy === item.eventType} trackColor={{ true: colors.accent }} onValueChange={(enabled) => void update(item.eventType, enabled)} />
          </View>)}
        </View>
        : <View className="items-center rounded-3xl border border-line bg-white px-6 py-10"><Text weight="bold">Chưa có tuỳ chọn nào</Text><Text className="mt-2 text-center text-sm text-muted">Các loại thông báo có thể bật sẽ xuất hiện ở đây.</Text></View>}
    </ScrollView>
  </View>;
}
