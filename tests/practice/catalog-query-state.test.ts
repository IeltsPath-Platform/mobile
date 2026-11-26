import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { catalogQueryState, isCompletedUnknown } from '@/src/features/practice/catalog/catalog-query-state';

describe('catalog dependency states', () => {
  it('keeps listing tests when the finished-test list fails, with completion unknown', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const failure = new Error('Service unavailable');
    const progress = new QueryObserver<{ completed: unknown[] }>(client, { queryKey: ['progress'], queryFn: async () => { throw failure; } });
    const tests = new QueryObserver(client, { queryKey: ['catalog'], queryFn: async () => [] });
    try {
      await progress.refetch();
      expect(isCompletedUnknown(progress.getCurrentResult())).toBe(true);
      expect(catalogQueryState(progress.getCurrentResult(), tests.getCurrentResult())).toEqual({ loading: true, error: null });
      await tests.refetch();
      expect(catalogQueryState(progress.getCurrentResult(), tests.getCurrentResult())).toEqual({ loading: false, error: null });

      progress.setOptions({ queryKey: ['progress'], queryFn: async () => ({ completed: [] }) });
      await progress.refetch();
      expect(isCompletedUnknown(progress.getCurrentResult())).toBe(false);
    } finally {
      progress.destroy(); tests.destroy(); client.clear();
    }
  });

  it('keeps the last finished-test list when a later refresh of it fails', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const progress = new QueryObserver<{ completed: unknown[] }>(client, { queryKey: ['progress'], queryFn: async () => ({ completed: [] }) });
    try {
      await progress.refetch();
      progress.setOptions({ queryKey: ['progress'], queryFn: async () => { throw new Error('offline'); } });
      await progress.refetch();
      expect(progress.getCurrentResult().isError).toBe(true);
      expect(isCompletedUnknown(progress.getCurrentResult())).toBe(false);
    } finally {
      progress.destroy(); client.clear();
    }
  });

  it('shows a catalog failure and waits only during genuine initial loading', () => {
    const ready = { isPending: false, error: null };
    const failure = new Error('Catalog unavailable');
    expect(catalogQueryState(ready, { isPending: false, error: failure })).toEqual({ loading: false, error: failure });
    expect(catalogQueryState({ isPending: true, error: null }, { isPending: true, error: null }).loading).toBe(true);
  });
});
