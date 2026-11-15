import { z } from 'zod';

const email = z
  .string()
  .trim()
  .min(1, 'Email không được để trống')
  .pipe(z.email('Email không đúng định dạng'));

const password = z
  .string()
  .min(6, 'Mật khẩu phải có từ 6 đến 72 ký tự')
  .max(72, 'Mật khẩu phải có từ 6 đến 72 ký tự');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Họ tên không được để trống'),
    email,
    phoneNumber: z
      .string()
      .trim()
      .refine((value) => value === '' || /^\+?\d{9,15}$/.test(value), 'Số điện thoại không hợp lệ'),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, 'Mã token không được để trống'),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
