---
phase: 3
title: Shared stubs Query Zod
status: completed
effort: S
---

# Phase 3: Shared stubs Query Zod

## Overview

Thêm TanStack Query provider, Zod schemas stub, `src/lib` + `src/types` sẵn sàng share với FE sau này.

## Implementation Steps

1. Cài `@tanstack/react-query`, `zod`
2. `src/lib/query-client.ts`, wrap root layout
3. `src/types/` + `src/schemas/` stub (User, DailyPlan)
4. Optional: `react-hook-form` dependency sẵn

## Success Criteria

- [ ] QueryClientProvider ở root
- [ ] Ít nhất 1 Zod schema export
