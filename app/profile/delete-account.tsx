import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/src/components/navigation/back-header';
import { StatusBarStrip } from '@/src/components/ui/band-status-bar';
import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { TextField } from '@/src/components/ui/text-field';
import { useAuth, useCurrentUser } from '@/src/features/auth/auth-provider';
import { googleAvailable, requestFreshGoogleIdToken } from '@/src/features/auth/google';
import { accessApi } from '@/src/features/practice/api/access';
import { Sheet } from '@/src/features/practice/components/sheet';
import { daysWithUs, DELETION_KEPT_NOTE, deletionSummary } from '@/src/features/profile/account-deletion';
import { profileApi } from '@/src/features/profile/api';
import { CryingOwl } from '@/src/features/profile/components/crying-owl';
import { colors } from '@/src/theme';

type Credential = { currentPassword: string } | { googleIdToken: string };

/** Lets the learner delete their own account, as Google Play requires. */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const user = useCurrentUser();
  const googleOnly = user.data?.hasPassword === false;
  const [confirming, setConfirming] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [formError, setFormError] = useState('');

  const wallet = useQuery({ queryKey: ['access', 'wallet'], queryFn: ({ signal }) => accessApi.wallet(signal), staleTime: 60_000, retry: 1 });
  const subscription = useQuery({ queryKey: ['access', 'subscription'], queryFn: ({ signal }) => accessApi.subscription(signal), staleTime: 60_000, retry: 1 });
  const days = daysWithUs(user.data?.createdAt);
  const summary = deletionSummary({ balance: wallet.data?.balance, premium: Boolean(subscription.data) });

  const mutation = useMutation({
    mutationFn: async (): Promise<boolean> => {
      let credential: Credential;
      if (googleOnly) {
        if (!googleAvailable()) throw new Error('Thiết bị này chưa hỗ trợ xác thực Google. Hãy xóa tài khoản trên web.');
        const googleIdToken = await requestFreshGoogleIdToken();
        if (!googleIdToken) return false;
        credential = { googleIdToken };
      } else {
        credential = { currentPassword };
      }
      await profileApi.deleteAccount(credential);
      return true;
    },
    onSuccess: (deleted) => {
      if (!deleted) return;
      setConfirming(false);
      // The server has already revoked every session; clearing the local one sends the app back to the welcome screen.
      const leave = () => void signOut();
      const message = 'Bạn đã được đăng xuất khỏi mọi thiết bị. Dữ liệu học tập sẽ được dọn khỏi hệ thống trong ít phút.';
      if (Platform.OS === 'web') {
        window.alert(`Tài khoản đã được xóa. ${message}`);
        leave();
        return;
      }
      Alert.alert('Tài khoản đã được xóa', message, [{ text: 'Đóng', onPress: leave }], { cancelable: false });
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const canDelete = googleOnly || currentPassword.length > 0;
  const submit = () => {
    if (!canDelete || mutation.isPending) return;
    setFormError('');
    mutation.mutate();
  };

  /** The password never outlives the sheet it was typed in. */
  const closeSheet = () => {
    setConfirming(false);
    setCurrentPassword('');
    setFormError('');
  };

  const keepAccount = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/account' as never));

  return (
    <View className="flex-1 bg-canvas">
      <View className="px-4" style={{ paddingTop: Math.max(insets.top, 12) + 4 }}>
        <BackButton fallbackHref="/(tabs)/account" />
      </View>

      <ScrollView contentContainerClassName="flex-grow justify-center px-7 pb-6" showsVerticalScrollIndicator={false}>
        <View className="items-center">
          <CryingOwl width={136} />
        </View>

        {days != null ? (
          <Text weight="black" className="mt-6 text-center text-[28px] leading-9">
            {days === 1 ? 'Mình mới quen nhau hôm nay mà…' : `Mình đã học cùng nhau ${days} ngày rồi…`}
          </Text>
        ) : (
          <Text weight="black" className="mt-6 text-center text-[28px] leading-9">Bạn muốn xóa tài khoản?</Text>
        )}
        <Text className="mt-3 text-center text-base leading-6 text-muted">{summary}</Text>
        <Text className="mt-6 text-center text-xs leading-5 text-muted" style={{ opacity: 0.8 }}>{DELETION_KEPT_NOTE}</Text>
      </ScrollView>
      <StatusBarStrip color={colors.canvas} />

      <View className="px-5 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <Button variant="success" label="Ở lại học tiếp" onPress={keepAccount} />
        <Pressable onPress={() => setConfirming(true)} accessibilityRole="button" className="mt-1 min-h-12 items-center justify-center active:opacity-60">
          <Text weight="bold" className="text-[15px]" style={{ color: colors.danger }}>Xóa tài khoản</Text>
        </Pressable>
      </View>

      <Sheet
        visible={confirming}
        title={googleOnly ? 'Xác thực để xóa' : 'Nhập mật khẩu để xóa'}
        subtitle="Tài khoản bị xóa ngay sau bước này."
        onClose={closeSheet}
        dismissable={!mutation.isPending}
        footer={
          <Button
            variant="danger"
            label={googleOnly ? 'Xác thực Google và xóa' : 'Xóa vĩnh viễn'}
            loading={mutation.isPending}
            loadingLabel="Đang xóa"
            disabled={!canDelete}
            onPress={submit}
          />
        }>
        {googleOnly ? (
          <View className="gap-3 pt-1">
            <Text className="text-sm leading-5 text-muted">Bạn đăng nhập bằng Google, nên sẽ chọn lại tài khoản Google để xác thực.</Text>
            {formError ? <FormAlert message={formError} /> : null}
          </View>
        ) : (
          <View className="gap-2 pt-1">
            <TextField
              label="Mật khẩu hiện tại"
              value={currentPassword}
              onChangeText={(value) => { setCurrentPassword(value); setFormError(''); }}
              secureToggle
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              placeholder="Mật khẩu đang dùng"
              returnKeyType="done"
              onSubmitEditing={submit}
            />
            {formError ? <FormAlert message={formError} /> : null}
          </View>
        )}
      </Sheet>
    </View>
  );
}
