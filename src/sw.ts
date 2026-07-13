/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

// Custom service worker. Precaches the built app (manifest injected by
// vite-plugin-pwa) and handles Web Push notifications + clicks.

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

precacheAndRoute(self.__WB_MANIFEST);

// Activate a freshly installed worker immediately (matches registerType autoUpdate).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

interface PushData {
  title?: string;
  body?: string;
  matchId?: string | null;
}

self.addEventListener('push', (event) => {
  let data: PushData = {};
  try {
    if (event.data) data = event.data.json();
  } catch {
    data = { body: event.data?.text() };
  }
  const title = data.title || 'Football Manager';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { matchId: data.matchId ?? null },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const matchId = (event.notification.data as { matchId?: string | null } | undefined)?.matchId ?? null;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus an existing tab and tell it to open the match; otherwise open one.
      for (const client of clients) {
        if ('focus' in client) {
          client.postMessage({ type: 'open-match', matchId });
          return client.focus();
        }
      }
      return self.clients.openWindow(matchId ? `/?match=${matchId}` : '/');
    }),
  );
});
