import { useState } from 'react';
import { Alert, Platform } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { TextField } from '@/src/components/ui/text-field';
import { authApi } from '@/src/features/auth/api';
import { useAuth } from '@/src/features/auth/auth-provider';
import { googleAvailable, requestFreshGoogleIdToken } from '@/src/features/auth/google';
import { profileApi } from '@/src/features/profile/api';
import { ApiError } from '@/src/lib/api-client';
import { PASSWORD_HINT, newPasswordError } from '@/src/lib/password-rules';

const describe = (cause: unknown) => (cause instanceof ApiError || cause instanceof Error ? cause.message : 'Có lỗi xảy ra, vui lòng thử lại.');

/**
 * Google-created accounts have no password. With Google on this build they prove it is them by picking the account again
 * and set the password here; otherwise the emailed code is the way.
 */
export function SetPasswordCard({ email }: { email: string }) {
  const { signOut } = useAuth();
  const [byEmail, setByEmail] = useState(() => !googleAvailable());
  const [sent, setSent] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'send' | 'save' | null>(null);

  const finish = () => {
    // The server ends every session after a password change, this one included.
    const leave = () => void signOut();
    if (Platform.OS === 'web') { window.alert('Đã tạo mật khẩu. Hãy đăng nhập lại.'); leave(); return; }
    Alert.alert('Đã tạo mật khẩu', 'Hãy đăng nhập lại để tiếp tục.', [{ text: 'Đăng nhập lại', onPress: leave }], { cancelable: false });
  };

  const saveWithGoogle = async () => {
    const problem = newPasswordError(password) ?? (password === confirm ? null : 'Mật khẩu xác nhận chưa khớp.');
    if (problem) return setError(problem);
    setBusy('save');
    setError('');
    try {
      const googleIdToken = await requestFreshGoogleIdToken();
      if (!googleIdToken) return;
      const { reauthToken } = await profileApi.reauthenticate({ googleIdToken });
      await profileApi.setInitialPassword(password, reauthToken);
      finish();
    } catch (cause) {
      setError(describe(cause));
    } finally {
      setBusy(null);
    }
  };

  const send = async () => {
    setBusy('send');
    setError('');
    try {
      setSent((await authApi.forgotPassword(email)).message);
    } catch (cause) {
      setError(describe(cause));
    } finally {
      setBusy(null);
    }
  };

  const saveWithCode = async () => {
    const problem = newPasswordError(password);
    if (problem) return setError(problem);
    setBusy('save');
    setError('');
    try {
      await authApi.resetPassword({ token: token.trim(), newPassword: password });
      finish();
    } catch (cause) {
      setError(describe(cause));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="mt-4 gap-4 p-4">
      <Text className="text-sm leading-5 text-muted">
        {byEmail
          ? 'Tài khoản này đăng nhập bằng Google nên chưa có mật khẩu. Chúng tôi sẽ gửi email chứa mã để bạn tạo mật khẩu.'
          : 'Tài khoản này đăng nhập bằng Google nên chưa có mật khẩu. Nhập mật khẩu mới rồi chọn lại tài khoản Google để xác nhận là bạn.'}
      </Text>
      {error ? <FormAlert message={error} /> : null}
      {byEmail ? (
        <>
          {sent ? <FormAlert tone="success" message={sent} /> : null}
          <Button variant={sent ? 'secondary' : 'primary'} label={sent ? 'Gửi lại email' : 'Gửi email tạo mật khẩu'} loading={busy === 'send'} disabled={busy !== null} onPress={() => void send()} />
          {sent ? (
            <>
              <TextField label="Mã trong email" value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} placeholder="Dán mã token" />
              <TextField label="Mật khẩu mới" value={password} onChangeText={setPassword} secureToggle autoCapitalize="none" autoCorrect={false} textContentType="newPassword" placeholder={PASSWORD_HINT} />
              <Button label="Tạo mật khẩu" loadingLabel="Đang lưu…" loading={busy === 'save'} disabled={!token.trim() || !password || busy !== null} onPress={() => void saveWithCode()} />
              <Text className="text-xs text-muted">Sau khi tạo mật khẩu, bạn sẽ được đăng xuất để đăng nhập lại.</Text>
            </>
          ) : null}
        </>
      ) : (
        <>
          <TextField label="Mật khẩu mới" value={password} onChangeText={setPassword} secureToggle autoCapitalize="none" autoCorrect={false} textContentType="newPassword" placeholder={PASSWORD_HINT} />
          <TextField label="Nhập lại mật khẩu mới" value={confirm} onChangeText={setConfirm} secureToggle autoCapitalize="none" autoCorrect={false} textContentType="newPassword" placeholder="Xác nhận mật khẩu mới" />
          <Button label="Xác nhận bằng Google và tạo mật khẩu" loadingLabel="Đang xác nhận…" loading={busy === 'save'} disabled={!password || !confirm || busy !== null} onPress={() => void saveWithGoogle()} />
          <Button variant="ghost" label="Nhận mã qua email thay cho Google" disabled={busy !== null} onPress={() => { setError(''); setByEmail(true); }} />
          <Text className="text-xs text-muted">Sau khi tạo mật khẩu, bạn sẽ được đăng xuất để đăng nhập lại.</Text>
        </>
      )}
    </Card>
  );
}
