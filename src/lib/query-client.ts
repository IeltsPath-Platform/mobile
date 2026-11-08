import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './api-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (failureCount, error) => {
        // 408/429 are transient and worth one more try; other 4xx will not change on retry.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500 && ![408, 429].includes(error.status)) return false;
        return failureCount < 1;
      },
    },
  },
});
