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
| UI kit | NativeWind + component riêng (**không** dùng shadcn web) |
| Server state | **TanStack Query** |
| Forms | **React Hook Form** + **Zod** (+ `@hookform/resolvers`) |
| Bundler | Metro (Expo) — **không Vite** |
| Push (sau này) | Expo Notifications |
| Audio (sau này) | `expo-av` |

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

## Cấu trúc

```text
app/                 # Expo Router screens
  (tabs)/
    index.tsx        # Hôm nay — daily plan
    practice.tsx     # Luyện tập ngắn
    community.tsx    # Cộng đồng
    profile.tsx      # Tiến độ / hồ sơ
src/
  lib/query-client.ts
  schemas/learner.ts # Zod stubs
  types/
components/          # UI helpers (template)
plans/               # ClaudeKit plans
```

## Scope base hiện tại

- [x] Expo + TS + Expo Router
- [x] NativeWind + tab shell 4 tab
- [x] TanStack Query provider + Zod stubs
- [ ] Auth / API thật
- [ ] Push notifications
- [ ] Audio listening 10'
- [ ] Feed cộng đồng đầy đủ

## Plan

Chi tiết triển khai base: `plans/260916-ielts-mobile-base/`
