import type { InfiniteData } from '@tanstack/react-query';

type WithReadState = { id: string; readAt?: string | null };

/** Drops the notifications matching `shouldRemove` from every loaded page, keeping the page structure. */
export function removeNotifications<T extends WithReadState>(
  data: InfiniteData<T[]> | undefined,
  shouldRemove: (item: T) => boolean,
): InfiniteData<T[]> | undefined {
  if (!data) return data;
  return { ...data, pages: data.pages.map((page) => page.filter((item) => !shouldRemove(item))) };
}

export const isReadNotification = (item: WithReadState) => Boolean(item.readAt);
