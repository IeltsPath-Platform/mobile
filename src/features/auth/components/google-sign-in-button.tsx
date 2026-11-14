import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { ApiError } from '@/src/lib/api-client';
import { GOOGLE_WEB_CLIENT_ID } from '@/src/lib/env';
import { haptics } from '@/src/lib/haptics';

import { useAuth } from '../auth-provider';

const GOOGLE_ERRORS: Record<string, string> = {
  GOOGLE_SIGNIN_NOT_ALLOWED: 'Tài khoản này không đăng nhập bằng Google được. Hãy dùng email và mật khẩu.',
  GOOGLE_EMAIL_NOT_SUPPORTED: 'Chỉ hỗ trợ tài khoản @gmail.com hoặc Google Workspace.',
  GOOGLE_ACCOUNT_CONFLICT: 'Tài khoản đã liên kết với một tài khoản Google khác.',
  GOOGLE_SIGNIN_UNAVAILABLE: 'Đăng nhập Google tạm chưa sẵn sàng. Vui lòng thử lại sau.',
};

let configured = false;

function configureGoogle() {
  if (configured || !GOOGLE_WEB_CLIENT_ID) return;
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  configured = true;
}

/** Clears the cached Google account so the next sign-in shows the account chooser. */
export async function signOutGoogle() {
  if (Platform.OS === 'web' || !configured) return;
  await GoogleSignin.signOut().catch(() => undefined);
}

function describe(error: unknown): string | null {
  if (error instanceof ApiError) return (error.code && GOOGLE_ERRORS[error.code]) || error.message;
  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS) return null;
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return 'Thiết bị chưa có Google Play Services.';
  }
  return 'Không đăng nhập được bằng Google. Vui lòng thử lại.';
}

export function GoogleSignInButton() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The native module does not exist on web, and without a client ID the backend would reject the token.
  const available = Platform.OS !== 'web' && !!GOOGLE_WEB_CLIENT_ID;

  const onPress = async () => {
    if (!available || loading) return;
    setError(null);
    setLoading(true);
    try {
      configureGoogle();
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return;
      const idToken = response.data.idToken;
      if (!idToken) throw new Error('Missing Google ID token');
      await signInWithGoogle(idToken);
    } catch (cause) {
      const message = describe(cause);
      if (message) {
        haptics.error();
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (Platform.OS === 'web') return null;

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-line" />
        <Text className="text-xs text-muted">hoặc</Text>
        <View className="h-px flex-1 bg-line" />
      </View>
      {error ? <FormAlert message={error} /> : null}
      <Button
        variant="secondary"
        label="Đăng nhập với Google"
        loadingLabel="Đang mở Google…"
        loading={loading}
        disabled={!available}
        onPress={() => void onPress()}
      />
      {!available ? (
        <Text className="text-center text-sm leading-5 text-muted">Đăng nhập Google chưa được cấu hình trên bản build này.</Text>
      ) : null}
    </View>
  );
}
