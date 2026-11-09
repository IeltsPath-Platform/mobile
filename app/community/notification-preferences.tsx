import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, View } from 'react-native';
import { BackHeader } from '@/src/components/navigation/back-header';
import { Text } from '@/src/components/ui/text';
import { communityApi } from '@/src/features/community/api';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

const PREFERENCE_COPY: Record<string, { title: string; detail: string; group: 'activity' | 'connections' | 'other' }> = {
  'community.post-commented.v1': {
    title: 'Bình luận bài viết',
    detail: 'Khi có người bình luận bài viết bạn đăng.',
    group: 'activity',
  },
  'community.comment-replied.v1': {
    title: 'Trả lời bình luận',
    detail: 'Khi có người trả lời bình luận của bạn.',
    group: 'activity',
  },
  'community.comment-mentioned.v1': {
    title: 'Được nhắc đến',
    detail: 'Khi có người nhắc tên bạn trong bình luận.',
    group: 'activity',
  },
  'community.post-reacted.v1': {
    title: 'Cảm xúc bài viết',
    detail: 'Khi có người bày tỏ cảm xúc với bài viết của bạn.',
    group: 'activity',
  },
  'community.user-followed.v1': {
    title: 'Người theo dõi mới',
    detail: 'Khi có người mới bắt đầu theo dõi bạn.',
    group: 'connections',
  },
};

const preferenceCopy = (type: string) =>
  PREFERENCE_COPY[type] ?? {
    title: 'Hoạt động cộng đồng khác',
    detail: 'Thông báo về hoạt động khác trong cộng đồng.',
    group: 'other' as const,
  };

export default function NotificationPreferencesScreen() {
  useTheme();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['community', 'notification-preferences'], queryFn: communityApi.preferences });
  const [busy, setBusy] = useState<string>();
  const sections = [
    { key: 'activity', title: 'BÀI VIẾT & BÌNH LUẬN' },
    { key: 'connections', title: 'NGƯỜI THEO DÕI' },
    { key: 'other', title: 'HOẠT ĐỘNG KHÁC' },
  ].map((section) => ({
    ...section,
    items: (query.data ?? []).filter((item) => preferenceCopy(item.eventType).group === section.key),
  })).filter((section) => section.items.length > 0);

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
    <BackHeader title="Tuỳ chọn thông báo" fallbackHref="/(tabs)/community" />
    <ScrollView contentContainerClassName="px-4 pb-10 pt-4">
      <Text className="mb-4 text-sm text-muted">Chọn hoạt động bạn muốn nhận thông báo.</Text>
      {query.isPending ? <View className="items-center py-16"><ActivityIndicator color={colors.accent} /><Text className="mt-3 text-sm text-muted">Đang tải tuỳ chọn…</Text></View>
        : query.isError ? <Pressable onPress={() => void query.refetch()} className="items-center rounded-3xl border border-line bg-surface p-6"><Text weight="bold">Không tải được tuỳ chọn</Text><Text className="mt-2 text-sm text-accent">Chạm để thử lại</Text></Pressable>
        : sections.length ? <View className="gap-4">
          {sections.map((section) => <View key={section.key}>
            <Text weight="bold" className="mb-2 ml-1 text-[11px] tracking-wide text-muted">{section.title}</Text>
            <View className="overflow-hidden rounded-3xl border border-line bg-surface">
              {section.items.map((item, index) => {
                const copy = preferenceCopy(item.eventType);
                const saving = busy === item.eventType;
                return <View key={item.eventType} className={`min-h-[76px] flex-row items-center px-4 py-3 ${index ? 'border-t border-line' : ''}`}>
                  <View className="flex-1 pr-3">
                    <Text weight="semibold" className="text-sm text-ink">{copy.title}</Text>
                    <Text className="mt-1 text-xs leading-4 text-muted">{copy.detail}</Text>
                  </View>
                  {saving ? <ActivityIndicator color={colors.accent} className="mx-2" /> : <Switch
                    value={item.enabled}
                    disabled={busy !== undefined}
                    accessibilityLabel={copy.title}
                    accessibilityHint={copy.detail}
                    trackColor={{ false: colors.line, true: colors.accent }}
                    thumbColor={colors.canvas}
                    onValueChange={(enabled) => void update(item.eventType, enabled)}
                  />}
                </View>;
              })}
            </View>
          </View>)}
        </View>
        : <View className="items-center rounded-3xl border border-line bg-surface px-6 py-10"><Text weight="bold">Chưa có tuỳ chọn nào</Text><Text className="mt-2 text-center text-sm text-muted">Các loại thông báo có thể bật sẽ xuất hiện ở đây.</Text></View>}
    </ScrollView>
  </View>;
}
