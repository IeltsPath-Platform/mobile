import { useCallback, useRef } from 'react';
import type { ScrollViewInstance } from 'react-native';

/**
 * Scrolls a question list to one question. Positions come from layout callbacks; a question that is not laid out yet
 * (another section just opened, or the list is about to mount) is scrolled to as soon as its layout arrives, instead
 * of using a stale position or none.
 */
export function useScrollToItem(margin = 12) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const positions = useRef(new Map<string, number>());
  const pending = useRef<string | null>(null);

  const scrollNow = useCallback((id: string) => {
    const y = positions.current.get(id);
    if (y === undefined) return false;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - margin), animated: true });
    return true;
  }, [margin]);

  const onItemLayout = useCallback((id: string, y: number) => {
    positions.current.set(id, y);
    // Wait a frame: parent offsets that complete this position may still be arriving.
    if (pending.current === id) requestAnimationFrame(() => { if (pending.current === id && scrollNow(id)) pending.current = null; });
  }, [scrollNow]);

  /** `afterLayout` when the list is about to change (new section, new tab): the known position may be stale. */
  const scrollToItem = useCallback((id: string, afterLayout = false) => {
    pending.current = id;
    if (afterLayout) return;
    requestAnimationFrame(() => { if (pending.current === id && scrollNow(id)) pending.current = null; });
  }, [scrollNow]);

  return { scrollRef, onItemLayout, scrollToItem };
}
