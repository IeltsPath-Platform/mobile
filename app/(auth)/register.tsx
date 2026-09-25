import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { TextInput } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { TextField } from '@/src/components/ui/text-field';
import { useAuth } from '@/src/features/auth/auth-provider';
import { AuthLink } from '@/src/features/auth/components/auth-link';
import { AuthScreen } from '@/src/features/auth/components/auth-screen';
import { applyApiError } from '@/src/features/auth/form-errors';
import { registerSchema, type RegisterInput } from '@/src/features/auth/schemas';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phoneNumber: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signUp(values);
    } catch (error) {
      setFormError(applyApiError(error, setError, ['fullName', 'email', 'phoneNumber', 'password']));
    }
  });

  return (
    <AuthScreen
      eyebrow="Bắt đầu lộ trình"
      title="Tạo tài khoản học tập"
      description="Miễn phí, không cần thẻ. Tài khoản dùng chung cho web và mobile."
      footer={<AuthLink prompt="Đã có tài khoản?" label="Đăng nhập" href="/login" />}>
      {formError ? <FormAlert message={formError} /> : null}

      <Controller
        control={control}
        name="fullName"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Họ và tên"
            placeholder="Nguyễn Văn A"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.fullName?.message}
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            ref={emailRef}
            label="Email"
            placeholder="ban@email.com"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
          />
        )}
      />

      <Controller
        control={control}
        name="phoneNumber"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            ref={phoneRef}
            label="Số điện thoại (không bắt buộc)"
            placeholder="0912345678"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.phoneNumber?.message}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            ref={passwordRef}
            label="Mật khẩu"
            placeholder="Tối thiểu 6 ký tự"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
            secureToggle
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            ref={confirmRef}
            label="Nhập lại mật khẩu"
            placeholder="Nhập lại mật khẩu"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.confirmPassword?.message}
            secureToggle
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
        )}
      />

      <Button label="Tạo tài khoản" loadingLabel="Đang tạo phiên…" loading={isSubmitting} onPress={onSubmit} />
    </AuthScreen>
  );
}
