import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, View } from 'react-native';
import { BackHeader } from '@/src/components/navigation/back-header';
import { Text } from '@/src/components/ui/text';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { communityApi } from '@/src/features/community/api';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

type PreferenceGroup = 'activity' | 'connections' | 'learning' | 'premium' | 'examiner' | 'other';

const PREFERENCE_COPY: Record<string, { title: string; detail: string; group: PreferenceGroup }> = {
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
  'assessment.grading-completed.v1': {
    title: 'Đã có kết quả chấm',
    detail: 'Khi bài viết của bạn được chấm xong.',
    group: 'learning',
  },
  'assessment.result-ready.v1': {
    title: 'Đã có kết quả bài thi',
    detail: 'Khi kết quả bài thi của bạn đã sẵn sàng.',
    group: 'learning',
  },
  'access.subscription-granted.v1': {
    title: 'Đã kích hoạt Premium',
    detail: 'Khi quyền Premium được cấp cho tài khoản.',
    group: 'premium',
  },
  'access.subscription-expiry-notice.v1': {
    title: 'Premium sắp hết hạn',
    detail: 'Nhắc khi quyền Premium sắp hết hạn hoặc đã hết hạn.',
    group: 'premium',
  },
  'assessment.grading-requested.v1': {
    title: 'Bài viết cần chấm',
    detail: 'Khi học viên chọn bạn chấm bài.',
    group: 'examiner',
  },
  'assessment.grading-due-soon.v1': {
    title: 'Sắp đến hạn chấm',
    detail: 'Nhắc khi bài được giao sắp đến hạn.',
    group: 'examiner',
  },
  'assessment.grading-overdue.v1': {
    title: 'Bài chấm quá hạn',
    detail: 'Khi bài viết bạn nhận chấm bị quá hạn.',
    group: 'examiner',
  },
};

// Unknown types fall back to the raw event type so new ones stay distinguishable instead of repeating one label.
const preferenceCopy = (type: string) =>
  PREFERENCE_COPY[type] ?? { title: type, detail: 'Loại thông báo khác.', group: 'other' as const };

const SECTIONS: { key: PreferenceGroup; title: string }[] = [
  { key: 'activity', title: 'BÀI VIẾT & BÌNH LUẬN' },
  { key: 'connections', title: 'NGƯỜI THEO DÕI' },
  { key: 'learning', title: 'HỌC TẬP' },
  { key: 'premium', title: 'TÀI KHOẢN PREMIUM' },
  { key: 'examiner', title: 'GIÁM KHẢO' },
  { key: 'other', title: 'KHÁC' },
];

export default function NotificationPreferencesScreen() {
  useTheme();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['community', 'notification-preferences'], queryFn: communityApi.preferences });
  const user = useCurrentUser();
  // The server lists every type for every account; grading-queue reminders only concern examiners.
  const isExaminer = user.data?.roles.some((role) => role.name === 'EXAMINER') ?? false;
  const mail = useQuery({ queryKey: ['community', 'mail-preferences'], queryFn: communityApi.mailPreferences });
  const [busy, setBusy] = useState<string>();
  const [mailBusy, setMailBusy] = useState(false);
  const sections = SECTIONS
    .filter((section) => section.key !== 'examiner' || isExaminer)
    .map((section) => ({
      ...section,
      items: (query.data ?? []).filter((item) => preferenceCopy(item.eventType).group === section.key),
    }))
    .filter((section) => section.items.length > 0);

  const update = async (eventType: string, enabled: boolean) => {
    setBusy(eventType);
    try {
      await communityApi.updatePreference(eventType, enabled);
      await queryClient.invalidateQueries({ queryKey: ['community', 'notification-preferences'] });
    } catch (error) {
      Alert.alert('Chưa thể lưu tuỳ chọn', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally { setBusy(undefined); }
  };

  const updateMail = async (learning: boolean) => {
    setMailBusy(true);
    try {
      queryClient.setQueryData(['community', 'mail-preferences'], await communityApi.updateMailPreferences(learning));
    } catch (error) {
      Alert.alert('Chưa thể lưu tuỳ chọn email', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally { setMailBusy(false); }
  };

  return <View className="flex-1 bg-canvas">
    <BackHeader title="Tuỳ chọn thông báo" fallbackHref="/(tabs)/community" />
    <ScrollView contentContainerClassName="px-4 pb-10 pt-4">
      <Text className="mb-4 text-sm text-muted">Chọn hoạt động bạn muốn nhận thông báo.</Text>
      {query.isPending ? <View className="items-center py-16"><ActivityIndicator color={colors.accent} /><Text className="mt-3 text-sm text-muted">Đang tải tuỳ chọn…</Text></View>
        : query.isError ? <Pressable onPress={() => void query.refetch()} className="items-center rounded-3xl border border-line bg-surface p-6"><Text weight="bold">Không tải được tuỳ chọn</Text><Text className="mt-2 text-sm text-accent">Chạm để thử lại</Text></Pressable>
        : sections.length ? <View className="gap-4">
          {mail.data ? <View>
            <Text weight="bold" className="mb-2 ml-1 text-[11px] tracking-wide text-muted">EMAIL</Text>
            <View className="min-h-[76px] flex-row items-center overflow-hidden rounded-3xl border border-line bg-surface px-4 py-3">
              <View className="flex-1 pr-3">
                <Text weight="semibold" className="text-sm text-ink">Email học tập</Text>
                <Text className="mt-1 text-xs leading-4 text-muted">Nhận email khi bài được chấm hoặc có kết quả. Email bảo mật và thanh toán luôn được gửi.</Text>
              </View>
              {mailBusy ? <ActivityIndicator color={colors.accent} className="mx-2" /> : <Switch value={mail.data.learning} disabled={busy !== undefined} accessibilityLabel="Email học tập" trackColor={{ false: colors.line, true: colors.accent }} thumbColor={colors.canvas} onValueChange={(learning) => void updateMail(learning)} />}
            </View>
          </View> : null}
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
