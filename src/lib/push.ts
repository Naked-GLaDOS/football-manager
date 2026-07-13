import { api } from './api';

// Client-side Web Push helpers. The account page uses these to opt this device
// in/out of push notifications.

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// Base64url VAPID key -> Uint8Array for pushManager.subscribe().
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.ready);
}

export async function isSubscribed(): Promise<boolean> {
  const reg = await getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

// Ask permission, subscribe this device with the server's VAPID key, and persist
// the subscription. Returns true on success. Throws with a message on failure.
export async function subscribeToPush(): Promise<boolean> {
  if (!pushSupported()) throw new Error('unsupported');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('denied');

  const { publicKey } = await api.pushPublicKey();
  if (!publicKey) throw new Error('server-push-disabled');

  const reg = await getRegistration();
  if (!reg) throw new Error('no-sw');

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  await api.pushSubscribe({
    endpoint: json.endpoint!,
    keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
  });
  return true;
}

export async function unsubscribeFromPush(): Promise<void> {
  const reg = await getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => {});
  await api.pushUnsubscribe(endpoint).catch(() => {});
}
