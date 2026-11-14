import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { TextField } from '@/src/components/ui/text-field';
import { authApi } from '@/src/features/auth/api';
import { useAuth, useCurrentUser } from '@/src/features/auth/auth-provider';
import { profileApi } from '@/src/features/profile/api';
import { ApiError } from '@/src/lib/api-client';
import { colors } from '@/src/theme';

/** Google-created accounts have no password; the reset-email flow is the only way to set one. */
function SetPasswordCard({ email }: { email: string }) {
  const { signOut } = useAuth();
  const [sent, setSent] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'send' | 'save' | null>(null);

  const fail = (cause: unknown) => setError(cause instanceof ApiError ? cause.message : 'Có lỗi xảy ra, vui lòng thử lại.');

  const send = async () => {
    setBusy('send');
    setError('');
    try {
      setSent((await authApi.forgotPassword(email)).message);
    } catch (cause) {
      fail(cause);
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (password.length < 6 || password.length > 72) return setError('Mật khẩu phải có từ 6 đến 72 ký tự.');
    setBusy('save');
    setError('');
    try {
      await authApi.resetPassword({ token: token.trim(), newPassword: password });
      // The reset revokes every refresh token, so the session cannot continue.
      await signOut();
    } catch (cause) {
      fail(cause);
      setBusy(null);
    }
  };

  return (
    <Card className="mt-4 gap-4 p-4">
      <Text className="text-sm leading-5 text-muted">
        Tài khoản này đăng nhập bằng Google nên chưa có mật khẩu. Chúng tôi sẽ gửi email chứa mã để bạn tạo mật khẩu.
      </Text>
      {error ? <FormAlert message={error} /> : null}
      {sent ? <FormAlert tone="success" message={sent} /> : null}
      <Button variant={sent ? 'secondary' : 'primary'} label={sent ? 'Gửi lại email' : 'Gửi email tạo mật khẩu'} loading={busy === 'send'} disabled={busy !== null} onPress={() => void send()} />
      {sent ? (
        <>
          <TextField label="Mã trong email" value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} placeholder="Dán mã token" />
          <TextField label="Mật khẩu mới" value={password} onChangeText={setPassword} secureToggle autoCapitalize="none" autoCorrect={false} textContentType="newPassword" placeholder="Từ 6 đến 72 ký tự" />
          <Button label="Tạo mật khẩu" loadingLabel="Đang lưu…" loading={busy === 'save'} disabled={!token.trim() || !password || busy !== null} onPress={() => void save()} />
          <Text className="text-xs text-muted">Sau khi tạo mật khẩu, bạn sẽ được đăng xuất để đăng nhập lại.</Text>
        </>
      ) : null}
    </Card>
  );
}

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const user = useCurrentUser();
  const needsPassword = user.data?.hasPassword === false;
  const needsVerification = user.data?.emailVerified === false;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      if (!currentPassword) throw new Error('Vui lòng nhập mật khẩu hiện tại.');
      if (newPassword.length < 6) throw new Error('Mật khẩu mới cần có ít nhất 6 ký tự.');
      if (newPassword !== confirmPassword) throw new Error('Mật khẩu xác nhận chưa khớp.');
      if (currentPassword === newPassword) throw new Error('Mật khẩu mới cần khác mật khẩu hiện tại.');
      return profileApi.changePassword({ currentPassword, newPassword });
    },
    // Changing the password revokes every refresh token, so the session ends here and the user signs in again.
    onSuccess: () => {
      setFormError('');
      setSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.code === 'EMAIL_NOT_VERIFIED') {
        setFormError('Bạn cần xác minh email trước khi đổi mật khẩu.');
        return;
      }
      setFormError(error.message);
    },
  });

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="flex-1 bg-canvas">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerClassName="px-5 pb-6"
          contentContainerStyle={{ paddingTop: Math.max(insets.top, 12) + 8 }}>
          <View className="mb-5 flex-row items-center gap-3">
            <BackButton fallbackHref="/(tabs)/account" />
            <View className="flex-1">
              <Text weight="black" className="text-xl">Đổi mật khẩu</Text>
              <Text className="text-xs text-muted">Bảo mật tài khoản của bạn</Text>
            </View>
          </View>

          <View className="rounded-3xl p-5" style={{ backgroundColor: colors.heroStart }}>
            <View className="flex-row items-center gap-4">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><ShieldCheck size={27} color="#fff" /></View>
              <View className="flex-1">
                <Text weight="extrabold" className="text-base text-white">Tạo mật khẩu an toàn</Text>
                <Text className="mt-1 text-sm leading-5 text-white/75">Mật khẩu mới phải có ít nhất 6 ký tự.</Text>
              </View>
            </View>
          </View>

          {saved ? <View className="mt-4"><FormAlert tone="success" message="Mật khẩu đã được cập nhật. Hãy đăng nhập lại để tiếp tục." /></View> : null}
          {needsPassword && user.data ? <SetPasswordCard email={user.data.email} /> : <Card className="mt-4 gap-4 p-4">
            <View className="mb-1 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft"><LockKeyhole size={18} color={colors.accentDeep} /></View>
              <View className="flex-1">
                <Text weight="extrabold" className="text-base">Thông tin mật khẩu</Text>
                <Text className="text-xs text-muted">Nhập mật khẩu hiện tại để xác nhận</Text>
              </View>
            </View>
            <TextField label="Mật khẩu hiện tại" value={currentPassword} onChangeText={setCurrentPassword} secureToggle autoCapitalize="none" autoCorrect={false} textContentType="password" placeholder="Mật khẩu đang dùng" returnKeyType="next" />
            <TextField label="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} secureToggle autoCapitalize="none" autoCorrect={false} textContentType="newPassword" placeholder="Ít nhất 6 ký tự" returnKeyType="next" />
            <TextField label="Nhập lại mật khẩu mới" value={confirmPassword} onChangeText={setConfirmPassword} secureToggle autoCapitalize="none" autoCorrect={false} textContentType="newPassword" placeholder="Xác nhận mật khẩu mới" returnKeyType="done" onSubmitEditing={() => { if (currentPassword && newPassword && confirmPassword && !mutation.isPending) mutation.mutate(); }} />
            {formError ? <FormAlert message={formError} /> : null}
            {needsVerification ? <Button label="Xác minh email" variant="secondary" onPress={() => router.push('/profile/verify-email' as never)} /> : null}
            {saved ? <Button label="Đăng nhập lại" variant="secondary" icon={<CheckCircle2 size={18} color={colors.success} />} onPress={() => void signOut()} /> : null}
          </Card>}
        </ScrollView>

        {!saved && !needsPassword ? <View className="border-t border-line bg-surface px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <Button label="Cập nhật mật khẩu" loading={mutation.isPending} loadingLabel="Đang cập nhật" disabled={!currentPassword || !newPassword || !confirmPassword} onPress={() => { setSaved(false); setFormError(''); mutation.mutate(); }} />
        </View> : null}
      </View>
    </KeyboardAvoidingView>
  );
}
