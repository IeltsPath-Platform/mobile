# IELTS Mobile

Base app mobile cho đồ án **Nền tảng luyện IELTS** (Phương án A + C) — phạm vi MVP: trợ lý học hằng ngày + cộng đồng.

Feature tree tham chiếu: `../260913-ielts-platform-feature-tree.md`

## Tech stack (đã chốt)

| Hạng mục | Công nghệ |
|----------|-----------|
| Framework | **React Native + Expo** (iOS + Android) |
| Language | **TypeScript** |
| Routing | **Expo Router** |
| Styling | **NativeWind** (Tailwind CSS cho RN) |
| Brand | Đồng bộ FE: primary `#123ab5`, CTA `#ff7624`, canvas `#f8f9fc` |
| UI kit | NativeWind + component riêng (**không** dùng shadcn web) |
| Server state | **TanStack Query** |
| Forms | **React Hook Form** + **Zod** (+ `@hookform/resolvers`) |
| Bundler | Metro (Expo) — **không Vite** |
| Push (sau này) | Expo Notifications |
| Audio (sau này) | `expo-av` |

### API thật vs mock (phase 1 + learning-path)

| Phần | Nguồn |
|------|--------|
| Auth / me | BE gateway (`EXPO_PUBLIC_AUTH_ENABLED=true`) |
| Streak | BE `/api/learning-support/streak` (fallback mock) |
| Community feed | BE `/api/community/posts` (fallback mock) |
| Vocab search | BE `/api/content/vocabulary/search` (fallback mock) |
| **Learning path Reading** | **Mock mặc định** (`EXPO_PUBLIC_USE_MOCK_LEARNING`); HTTP `/api/learning/**` khi `=false` |
| Daily Duolingo path (tab Hôm nay) | Mock UX riêng — khác contract learning |
| Skill progress cards cũ | Thay bằng lộ trình topic trên tab Luyện đề |

### Không dùng trên mobile

- Vite
- shadcn/ui (chỉ dành cho FE web)

### Đồng bộ với FE web

Tái dùng **types / Zod schemas / API client** (sau này qua `packages/shared`). **Không** tái dùng màn hình / component DOM.

FE web (đã chốt riêng): React + Vite + TypeScript + Tailwind + shadcn.

## Chạy app

```bash
cd mobile
npm install
npm start
```

Sau đó mở Expo Go (Android/iOS) hoặc nhấn `a` / `i` trong terminal.

`expo-secure-store` là native module: Expo Go có sẵn, còn development build phải build lại sau khi cài.

### Kết nối backend

App gọi **API gateway** (`:8080`), không gọi thẳng user-service. Đặt địa chỉ qua biến môi trường (file `mobile/.env`):

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8080
```

| Môi trường | Giá trị mặc định / cần đặt |
|-----------|-----------|
| iOS simulator, web | `http://localhost:8080` (mặc định) |
| Android emulator | `http://10.0.2.2:8080` (mặc định) |
| Máy thật (Expo Go) | IP LAN của máy chạy backend, bắt buộc đặt biến trên |

Luồng auth (tạm tắt):

Mặc định `AUTH_ENABLED=false` — app mở thẳng các tab, không bắt đăng nhập (chưa có DB). Khi backend sẵn sàng, đặt trong `mobile/.env`:

```bash
EXPO_PUBLIC_AUTH_ENABLED=true
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8080
```

Khi bật lại:

- `POST /auth/login` → lưu `accessToken` + `refreshToken` vào SecureStore (Keychain/Keystore; web dùng `localStorage`).
- Request cần đăng nhập gửi `Authorization: Bearer <accessToken>`; gặp 401 thì gọi `POST /auth/refresh` một lần (dùng chung cho các request song song vì refresh token xoay vòng), refresh lỗi thì về màn đăng nhập.
- Đăng ký `POST /api/users/register` rồi tự đăng nhập; hồ sơ lấy từ `GET /api/users/me`; đăng xuất gọi `POST /auth/logout` rồi xoá token.
- Quên mật khẩu: backend hiện chỉ ghi mã reset ra log server (chưa gửi email), nên màn "Đặt lại mật khẩu" cần dán mã thủ công.

## Giao diện

Theo FE web **IELTSPath**: nền kem `#faf8f5`, chữ `#1c1917`, accent hổ phách `#f59e0b` / `#d97706`, thẻ trắng viền `#ede8df` với cạnh dưới "3D", font **Be Vietnam Pro**, màu kỹ năng Listening/Reading/Writing/Speaking/Full test. Token nằm ở `src/theme/tokens.js` (dùng chung cho Tailwind và code).

Font custom tự mang weight, nên dùng `<Text weight="bold">` (`src/components/ui/text.tsx`) thay cho class `font-bold`.

## Cấu trúc

```text
app/
  _layout.tsx        # Font, providers, guard (Stack.Protected)
  (auth)/            # login, register, forgot-password, reset-password
  (tabs)/            # Hôm nay, Luyện đề, Cộng đồng, Tiến độ (hồ sơ + đăng xuất)
src/
  components/ui/     # Text, Button, TextField, Card, FormAlert, BrandLogo
  features/auth/     # api, schemas (Zod khớp DTO backend), AuthProvider, màn auth
  features/practice/ # danh sách kỹ năng + SkillCard
  lib/               # env, api-client (Bearer + refresh), token-storage, query-client
  schemas/learner.ts # Zod stubs
  theme/             # design tokens
plans/               # ClaudeKit plans
```

## Scope base hiện tại

- [x] Expo + TS + Expo Router
- [x] NativeWind + tab shell 4 tab
- [x] TanStack Query provider + Zod stubs
- [x] Auth thật qua gateway (đăng nhập, đăng ký, refresh, đăng xuất, quên/đặt lại mật khẩu)
- [x] Giao diện IELTSPath theo FE web
- [ ] API học tập (learning-support, content, assessment)
- [ ] Push notifications
- [ ] Audio listening 10'
- [ ] Feed cộng đồng đầy đủ

## Plan

Chi tiết triển khai base: `plans/260916-ielts-mobile-base/`
