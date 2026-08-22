import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// Keep the installed PWA current. sw.ts self-activates a new build immediately
// (skipWaiting + clients.claim), so when an update is found the controller
// changes and we reload to swap in the fresh assets. A page-load registration
// alone isn't enough for a PWA left open for days, so we also poll for a new
// build hourly and whenever the app regains focus — otherwise it stays pinned to
// a stale cached version and reloading the page never picks up the new one.
if ('serviceWorker' in navigator) {
  // Reload only when an *existing* controller is replaced (a real update), not on
  // the very first install where there was no controller to begin with.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((r) => {
      const check = () => { r.update().catch(() => {}); };
      setInterval(check, 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    }).catch(() => {});
  });
}

const el = document.getElementById('root');
if (!el) throw new Error('Root element not found');

createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>
);
