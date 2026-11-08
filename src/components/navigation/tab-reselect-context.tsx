import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type TabActions = {
  register: (routeName: string, handler: () => void) => () => void;
  notify: (routeName: string) => void;
  resetTabBar: () => void;
  handleScroll: (offsetY: number) => void;
};

// Actions are stable for the provider's lifetime; visibility lives in its own
// context so screens that only forward scroll events do not re-render when the bar toggles.
const TabActionsContext = createContext<TabActions | null>(null);
const TabBarVisibleContext = createContext(true);

export function TabReselectProvider({ children }: { children: ReactNode }) {
  const handlers = useRef(new Map<string, Set<() => void>>());
  const lastOffset = useRef(0);
  const [tabBarVisible, setTabBarVisible] = useState(true);

  const register = useCallback((routeName: string, handler: () => void) => {
    const routeHandlers = handlers.current.get(routeName) ?? new Set<() => void>();
    routeHandlers.add(handler);
    handlers.current.set(routeName, routeHandlers);
    return () => {
      routeHandlers.delete(handler);
      if (routeHandlers.size === 0 && handlers.current.get(routeName) === routeHandlers) {
        handlers.current.delete(routeName);
      }
    };
  }, []);

  const notify = useCallback((routeName: string) => {
    handlers.current.get(routeName)?.forEach((handler) => handler());
  }, []);

  const resetTabBar = useCallback(() => {
    lastOffset.current = 0;
    setTabBarVisible(true);
  }, []);

  const handleScroll = useCallback((offsetY: number) => {
    if (!Number.isFinite(offsetY)) return;
    const previousOffset = lastOffset.current;
    lastOffset.current = Math.max(0, offsetY);

    if (offsetY <= 0 || offsetY < previousOffset - 8) {
      setTabBarVisible(true);
    } else if (offsetY > previousOffset + 8) {
      setTabBarVisible(false);
    }
  }, []);

  const actions = useMemo(
    () => ({ register, notify, resetTabBar, handleScroll }),
    [handleScroll, notify, register, resetTabBar],
  );
  return (
    <TabActionsContext.Provider value={actions}>
      <TabBarVisibleContext.Provider value={tabBarVisible}>{children}</TabBarVisibleContext.Provider>
    </TabActionsContext.Provider>
  );
}

export function useTabReselect(routeName: string, onReselect: () => void) {
  const context = useContext(TabActionsContext);
  const callback = useRef(onReselect);
  callback.current = onReselect;

  useEffect(() => {
    if (!context) return;
    return context.register(routeName, () => callback.current());
  }, [context, routeName]);
}

export function useNotifyTabReselect() {
  return useContext(TabActionsContext)?.notify;
}

const noop = () => {};

export function useTabBarControls() {
  const tabBarVisible = useContext(TabBarVisibleContext);
  const resetTabBar = useContext(TabActionsContext)?.resetTabBar ?? noop;
  return { tabBarVisible, resetTabBar };
}

export function useTabBarOffsetHandler() {
  return useContext(TabActionsContext)?.handleScroll ?? noop;
}

export function useTabBarScrollHandler() {
  const handleScroll = useTabBarOffsetHandler();
  return useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      handleScroll(event.nativeEvent.contentOffset.y);
    },
    [handleScroll],
  );
}
