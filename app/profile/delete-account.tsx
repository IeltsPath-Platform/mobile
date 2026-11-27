import { useMutation } from '@tanstack/react-query';
import { TriangleAlert, UserX } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/src/components/navigation/back-header';
import { StatusBarStrip } from '@/src/components/ui/band-status-bar';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { TextField } from '@/src/components/ui/text-field';
import { useAuth, useCurrentUser } from '@/src/features/auth/auth-provider';
import { googleAvailable, requestFreshGoogleIdToken } from '@/src/features/auth/google';
import { DELETE_CONFIRM_WORD, DELETION_CONSEQUENCES, isDeleteConfirmed } from '@/src/features/profile/account-deletion';
import { profileApi } from '@/src/features/profile/api';
import { colors } from '@/src/theme';

type Credential = { currentPassword: string } | { googleIdToken: string };

/** Lets the learner delete their own account, as Google Play requires. */
export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const user = useCurrentUser();
  const googleOnly = user.data?.hasPassword === false;
  const [confirmWord, setConfirmWord] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [formError, setFormError] = useState('');
  const confirmed = isDeleteConfirmed(confirmWord);

  const mutation = useMutation({
    mutationFn: async (): Promise<boolean> => {
      let credential: Credential;
      if (googleOnly) {
        if (!googleAvailable()) throw new Error('Thiết bị này chưa hỗ trợ xác thực Google. Hãy xóa tài khoản trên web.');
        const googleIdToken = await requestFreshGoogleIdToken();
        if (!googleIdToken) return false;
        credential = { googleIdToken };
      } else {
        if (!currentPassword) throw new Error('Vui lòng nhập mật khẩu hiện tại.');
        credential = { currentPassword };
      }
      await profileApi.deleteAccount(credential);
      return true;
    },
    onSuccess: (deleted) => {
      if (!deleted) return;
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

  const submit = () => {
    if (!confirmed || mutation.isPending) return;
    setFormError('');
    mutation.mutate();
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <View className="flex-1 bg-canvas">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerClassName="px-5 pb-6"
          contentContainerStyle={{ paddingTop: Math.max(insets.top, 12) + 8 }}>
          <View className="mb-5 flex-row items-center gap-3">
            <BackButton fallbackHref="/(tabs)/account" />
            <View className="flex-1">
              <Text weight="black" className="text-xl">Xóa tài khoản</Text>
              <Text className="text-xs text-muted">Thao tác này không thể hoàn tác</Text>
            </View>
          </View>

          <View className="rounded-3xl p-5" style={{ backgroundColor: colors.danger }}>
            <View className="flex-row items-center gap-4">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><UserX size={27} color="#fff" /></View>
              <View className="flex-1">
                <Text weight="extrabold" className="text-base text-white">Xóa vĩnh viễn tài khoản</Text>
                <Text className="mt-1 text-sm leading-5 text-white/80">Việc xóa được thực hiện ngay, không có thời gian chờ.</Text>
              </View>
            </View>
          </View>

          <Card className="mt-4 gap-3 p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-danger-soft"><TriangleAlert size={18} color={colors.danger} /></View>
              <Text weight="extrabold" className="flex-1 text-base">Điều gì xảy ra khi xóa</Text>
            </View>
            {DELETION_CONSEQUENCES.map((item) => (
              <View key={item} className="flex-row gap-2.5">
                <View className="mt-[7px] h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.danger }} />
                <Text className="flex-1 text-sm leading-5 text-muted">{item}</Text>
              </View>
            ))}
          </Card>

          <Card className="mt-4 gap-4 p-4">
            <TextField
              label={`Nhập ${DELETE_CONFIRM_WORD} để xác nhận`}
              value={confirmWord}
              onChangeText={setConfirmWord}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={DELETE_CONFIRM_WORD}
              returnKeyType={googleOnly ? 'done' : 'next'}
            />
            {googleOnly ? (
              <Text className="text-sm leading-5 text-muted">Bạn đăng nhập bằng Google, nên sẽ chọn lại tài khoản Google để xác nhận.</Text>
            ) : (
              <TextField
                label="Mật khẩu hiện tại"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureToggle
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                placeholder="Mật khẩu đang dùng"
                returnKeyType="done"
                onSubmitEditing={submit}
              />
            )}
            {formError ? <FormAlert message={formError} /> : null}
          </Card>
        </ScrollView>
        <StatusBarStrip color={colors.canvas} />

        <View className="border-t border-line bg-surface px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <Button
            variant="danger"
            label={googleOnly ? 'Xác thực Google và xóa' : 'Xóa vĩnh viễn'}
            loading={mutation.isPending}
            loadingLabel="Đang xóa"
            disabled={!confirmed || (!googleOnly && !currentPassword)}
            onPress={submit}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
