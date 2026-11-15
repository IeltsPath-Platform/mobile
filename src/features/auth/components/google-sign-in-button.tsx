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

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

const EXPO_GO_MESSAGE = 'Đăng nhập Google cần bản dev build của ứng dụng, không chạy trong Expo Go. Hãy dùng email và mật khẩu.';

let googleModule: GoogleSigninModule | null | undefined;

/**
 * The library has a native module that Expo Go does not ship, so importing it at the top of the
 * file would crash the whole app on launch. Load it on first use and treat a failure as "unavailable".
 */
function loadGoogleSignin(): GoogleSigninModule | null {
  if (googleModule !== undefined) return googleModule;
  try {
    googleModule = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    googleModule = null;
  }
  return googleModule;
}

let configured = false;

function configureGoogle(google: GoogleSigninModule) {
  if (configured || !GOOGLE_WEB_CLIENT_ID) return;
  google.GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  configured = true;
}

/** Clears the cached Google account so the next sign-in shows the account chooser. */
export async function signOutGoogle() {
  if (Platform.OS === 'web' || !configured) return;
  await loadGoogleSignin()?.GoogleSignin.signOut().catch(() => undefined);
}

function describe(error: unknown, google: GoogleSigninModule | null): string | null {
  if (error instanceof ApiError) return (error.code && GOOGLE_ERRORS[error.code]) || error.message;
  if (google?.isErrorWithCode(error)) {
    const { statusCodes } = google;
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
    const google = loadGoogleSignin();
    if (!google) {
      setError(EXPO_GO_MESSAGE);
      return;
    }
    setLoading(true);
    try {
      configureGoogle(google);
      await google.GoogleSignin.hasPlayServices();
      const response = await google.GoogleSignin.signIn();
      if (!google.isSuccessResponse(response)) return;
      const idToken = response.data.idToken;
      if (!idToken) throw new Error('Missing Google ID token');
      await signInWithGoogle(idToken);
    } catch (cause) {
      const message = describe(cause, google);
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
