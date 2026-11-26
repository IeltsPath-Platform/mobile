import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MonitorSmartphone } from 'lucide-react-native';
import { ActivityIndicator, Alert, FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { EmptyState } from '@/src/components/ui/empty-state';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { profileApi, profileQueryKeys, type DeviceSession } from '@/src/features/profile/api';
import { describeDevice, formatSessionTime } from '@/src/features/profile/session-view';
import { ApiError } from '@/src/lib/api-client';
import { colors } from '@/src/theme';

/** Where the account is signed in. Another device can be signed out from here; this one signs out from the profile. */
export default function SessionsScreen() {
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const sessions = useQuery({ queryKey: profileQueryKeys.sessions, queryFn: profileApi.getSessions });
  const reload = () => client.invalidateQueries({ queryKey: profileQueryKeys.sessions });

  const revokeOne = useMutation({
    mutationFn: profileApi.revokeSession,
    // Already gone (signed out on that device meanwhile) is the wanted result, so the list is simply read again.
    onSettled: reload,
  });
  const revokeOthers = useMutation({ mutationFn: profileApi.revokeOtherSessions, onSettled: reload });

  const failure = [revokeOne.error, revokeOthers.error].find((error) => error && !(error instanceof ApiError && error.code === 'SESSION_NOT_FOUND'));
  const list = [...(sessions.data ?? [])].sort((a, b) => Number(b.current) - Number(a.current));
  const hasOthers = list.some((session) => !session.current);
  const busy = revokeOne.isPending || revokeOthers.isPending;

  const confirmOne = (session: DeviceSession) =>
    Alert.alert('Đăng xuất thiết bị này?', `${describeDevice(session.userAgent)} sẽ phải đăng nhập lại.`, [
      { text: 'Giữ lại', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => { revokeOthers.reset(); revokeOne.mutate(session.sessionId); } },
    ]);

  const confirmOthers = () =>
    Alert.alert('Đăng xuất mọi thiết bị khác?', 'Chỉ thiết bị bạn đang cầm còn đăng nhập.', [
      { text: 'Giữ lại', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => { revokeOne.reset(); revokeOthers.mutate(); } },
    ]);

  return (
    <View className="flex-1 bg-canvas">
      <BackHeader title="Thiết bị đăng nhập" fallbackHref="/(tabs)/account" />
      {sessions.isPending ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.accent} /><Text className="mt-2 text-sm text-muted">Đang tải danh sách thiết bị…</Text></View>
      ) : sessions.isError && !sessions.data ? (
        <EmptyState title="Chưa tải được danh sách" message={sessions.error.message} mood="oops" action={<Button label="Thử lại" variant="secondary" onPress={() => void sessions.refetch()} />} />
      ) : (
        // Virtualised: an account used for a while holds dozens of sessions, and drawing them all at once took seconds.
        <FlatList
          data={list}
          keyExtractor={(session) => session.sessionId}
          initialNumToRender={5}
          windowSize={5}
          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={sessions.isRefetching} onRefresh={() => void sessions.refetch()} tintColor={colors.accent} />}
          ListHeaderComponent={failure ? <FormAlert message={failure.message} /> : undefined}
          ListEmptyComponent={<Text className="text-center text-sm text-muted">Chưa có phiên đăng nhập nào.</Text>}
          ListFooterComponent={hasOthers ? <Button label="Đăng xuất mọi thiết bị khác" loading={revokeOthers.isPending} disabled={busy} onPress={confirmOthers} /> : undefined}
          renderItem={({ item: session }) => (
            <Card className="gap-2 p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft"><MonitorSmartphone size={20} color={colors.accentDeep} /></View>
                <View className="min-w-0 flex-1">
                  <Text weight="extrabold" className="text-base text-ink">{describeDevice(session.userAgent)}</Text>
                  {session.current ? <Text weight="bold" className="text-xs" style={{ color: colors.success }}>Thiết bị này</Text> : null}
                </View>
              </View>
              <Text className="text-xs leading-5 text-muted">
                Đăng nhập lúc {formatSessionTime(session.startedAt)}{'\n'}Hoạt động gần nhất {formatSessionTime(session.lastUsedAt ?? session.startedAt)}{session.ipAddress ? `\nĐịa chỉ IP ${session.ipAddress}` : ''}
              </Text>
              {session.current ? null : (
                <Button variant="secondary" label="Đăng xuất thiết bị này" loading={revokeOne.isPending && revokeOne.variables === session.sessionId} disabled={busy} onPress={() => confirmOne(session)} />
              )}
            </Card>
          )}
        />
      )}
    </View>
  );
}
