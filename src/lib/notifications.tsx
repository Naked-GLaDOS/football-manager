import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, type AppNotification } from './api';

// In-app notification feed. Polls the server, refreshes on window focus, and
// listens for service-worker messages (notification clicks) so the bell badge
// and list stay current. Deep-links to a match are surfaced via `onOpenMatch`.

interface NotificationsState {
  items: AppNotification[];
  unreadCount: number;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const Ctx = createContext<NotificationsState | null>(null);

const POLL_MS = 60 * 1000;

export function NotificationProvider({
  children, onOpenMatch,
}: { children: React.ReactNode; onOpenMatch?: (matchId: string) => void }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const openMatchRef = useRef(onOpenMatch);
  openMatchRef.current = onOpenMatch;

  const refresh = useCallback(async () => {
    try {
      const { items, unreadCount } = await api.notifications();
      setItems(items);
      setUnreadCount(unreadCount);
    } catch {
      /* offline / unauthorized — leave last known state */
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    await api.markNotificationRead(id).catch(() => {});
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
    setUnreadCount(0);
    await api.markAllNotificationsRead().catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);

    // Service worker relays notification clicks so we can open the match + refresh.
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'open-match') {
        refresh();
        if (e.data.matchId) openMatchRef.current?.(e.data.matchId);
      }
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, [refresh]);

  return (
    <Ctx.Provider value={{ items, unreadCount, refresh, markRead, markAllRead }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNotifications(): NotificationsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
