---
phase: 1
title: Scaffold Expo Router TS
status: completed
effort: S
---

# Phase 1: Scaffold Expo Router TS

## Overview

Tạo app Expo (TypeScript) với Expo Router trong `d:\DOAN\mobile`, giữ `.git` và `plans/` hiện có.

## Implementation Steps

1. `npx create-expo-app` template tabs (Expo Router) vào thư mục tạm rồi merge lên root mobile (tránh conflict `.git`/`plans`)
2. Đảm bảo `app/` routes, `package.json`, `tsconfig`, `app.json`/`app.config`
3. `npm install` thành công; `npx tsc --noEmit` hoặc `npx expo export` smoke nếu khả thi

## Success Criteria

- [ ] `package.json` có expo, expo-router, react-native, typescript
- [ ] Entry Expo Router hoạt động (`app/_layout.tsx`)
- [ ] `.gitignore` chuẩn Expo
