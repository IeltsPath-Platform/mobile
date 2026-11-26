import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

import { GOOGLE_WEB_CLIENT_ID } from '@/src/lib/env';

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

let googleModule: GoogleSigninModule | null | undefined;

/**
 * The library has a native module that Expo Go (and builds made before it was added) do not ship,
 * so importing it at the top of the file would crash the whole app on launch. Check the binary for
 * the module first (requiring the JS would raise a red-box invariant) and treat absence as "unavailable".
 */
export function loadGoogleSignin(): GoogleSigninModule | null {
  if (googleModule !== undefined) return googleModule;
  if (!TurboModuleRegistry.get('RNGoogleSignin') && !NativeModules.RNGoogleSignin) {
    googleModule = null;
    return googleModule;
  }
  try {
    // Loaded on demand, only after the native module was found: importing it at the top would crash builds without it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    googleModule = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    googleModule = null;
  }
  return googleModule;
}

let configured = false;

export function configureGoogle(google: GoogleSigninModule) {
  if (configured || !GOOGLE_WEB_CLIENT_ID) return;
  google.GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  configured = true;
}

/** Clears the cached Google account so the next sign-in shows the account chooser. */
export async function signOutGoogle() {
  if (Platform.OS === 'web' || !configured) return;
  await loadGoogleSignin()?.GoogleSignin.signOut().catch(() => undefined);
}

/** Whether this build can ask Google for a token at all. */
export function googleAvailable() {
  return Platform.OS !== 'web' && Boolean(GOOGLE_WEB_CLIENT_ID) && loadGoogleSignin() !== null;
}

/**
 * Asks the learner to pick their Google account again and returns a fresh ID token, which the server accepts as proof
 * for a sensitive action. Null when they closed the chooser.
 */
export async function requestFreshGoogleIdToken(): Promise<string | null> {
  const google = loadGoogleSignin();
  if (!google) throw new Error('Bản ứng dụng này chưa hỗ trợ đăng nhập Google.');
  configureGoogle(google);
  try {
    await google.GoogleSignin.hasPlayServices();
    // A cached account would hand back an old token, which the server refuses.
    await google.GoogleSignin.signOut().catch(() => undefined);
    const response = await google.GoogleSignin.signIn();
    if (!google.isSuccessResponse(response)) return null;
    if (!response.data.idToken) throw new Error('Google không trả về mã xác thực. Vui lòng thử lại.');
    return response.data.idToken;
  } catch (cause) {
    if (google.isErrorWithCode(cause)) {
      const { statusCodes } = google;
      if (cause.code === statusCodes.SIGN_IN_CANCELLED || cause.code === statusCodes.IN_PROGRESS) return null;
      throw new Error('Không xác thực được bằng Google. Vui lòng thử lại.');
    }
    throw cause;
  }
}
