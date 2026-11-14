import { MailCheck } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
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
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { ApiError } from '@/src/lib/api-client';
import { colors } from '@/src/theme';

const message = (error: unknown) => (error instanceof ApiError ? error.message : 'Có lỗi xảy ra, vui lòng thử lại.');

export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token?: string }>();
  const user = useCurrentUser();
  const [token, setToken] = useState(params.token ?? '');
  const [busy, setBusy] = useState<'verify' | 'resend' | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const email = user.data?.email;
  const verified = user.data?.emailVerified === true;

  const run = async (kind: 'verify' | 'resend', action: () => Promise<{ message: string }>) => {
    setBusy(kind);
    setError('');
    setInfo('');
    try {
      setInfo((await action()).message);
      if (kind === 'verify') {
        setToken('');
        await user.refetch();
      }
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="flex-1 bg-canvas">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-5 pb-6"
          contentContainerStyle={{ paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: Math.max(insets.bottom, 12) }}>
          <View className="mb-5 flex-row items-center gap-3">
            <BackButton fallbackHref="/(tabs)/account" />
            <View className="flex-1">
              <Text weight="black" className="text-xl">Xác minh email</Text>
              <Text className="text-xs text-muted">{email ?? 'Tài khoản của bạn'}</Text>
            </View>
          </View>

          {verified ? (
            <FormAlert tone="success" message="Email của bạn đã được xác minh." />
          ) : (
            <Card className="gap-4 p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft">
                  <MailCheck size={18} color={colors.accentDeep} />
                </View>
                <Text className="flex-1 text-sm leading-5 text-muted">
                  Dán mã trong email xác minh. Cần email đã xác minh để mua gói hoặc đổi mật khẩu.
                </Text>
              </View>
              {error ? <FormAlert message={error} /> : null}
              {info ? <FormAlert tone="success" message={info} /> : null}
              <TextField
                label="Mã xác minh"
                placeholder="Dán mã token"
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={() => token.trim() && void run('verify', () => authApi.verifyEmail(token.trim()))}
              />
              <Button
                label="Xác minh"
                loadingLabel="Đang xác minh…"
                loading={busy === 'verify'}
                disabled={!token.trim() || busy !== null}
                onPress={() => void run('verify', () => authApi.verifyEmail(token.trim()))}
              />
              <Button
                variant="secondary"
                label="Gửi lại email xác minh"
                loading={busy === 'resend'}
                disabled={!email || busy !== null}
                onPress={() => email && void run('resend', () => authApi.resendVerification(email))}
              />
            </Card>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
