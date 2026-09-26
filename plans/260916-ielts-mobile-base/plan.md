---
title: IELTS Mobile Expo Base
description: Scaffold Expo + RN + TS mobile base for IELTS daily learning + community MVP
status: completed
priority: P1
branch: main
tags:
  - mobile
  - expo
  - bootstrap
blockedBy: []
blocks: []
created: '2026-09-16T04:55:45.248Z'
createdBy: 'ck:plan'
source: skill
---

# IELTS Mobile Expo Base

## Overview

Dựng base mobile cho nền tảng IELTS (feature tree 260913): vòng học hằng ngày + cộng đồng. Stack đã chốt — không research lại. Scope: scaffold shell, không feature nghiệp vụ.

**Stack:** Expo + React Native + TypeScript + Expo Router + NativeWind + TanStack Query + Zod (+ RHF sẵn sàng).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Scaffold Expo Router TS](./phase-01-scaffold-expo-router-ts.md) | Completed |
| 2 | [NativeWind and app shell](./phase-02-nativewind-and-app-shell.md) | Completed |
| 3 | [Shared stubs Query Zod](./phase-03-shared-stubs-query-zod.md) | Completed |
| 4 | [README stack docs](./phase-04-readme-stack-docs.md) | Completed |

## Out of scope

- Full auth, API thật, push production, UI polish
- Web FE / admin
- shadcn / Vite trên mobile

## Dependencies

- Feature tree: `d:\DOAN\260913-ielts-platform-feature-tree.md`
