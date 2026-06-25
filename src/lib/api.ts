const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('fm_token');
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
}

export const api = {
  register: (email: string, password: string) =>
    request<{ token: string; passkeyOptOut: boolean }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; passkeyOptOut: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  passkeyOptOut: () =>
    request<{ ok: boolean }>('/auth/passkey/opt-out', { method: 'POST' }),

  passkeyRegisterOptions: () =>
    request<PublicKeyCredentialCreationOptionsJSON>('/auth/passkey/register/options', { method: 'POST' }),

  passkeyRegisterVerify: (response: unknown) =>
    request<{ verified: boolean }>('/auth/passkey/register/verify', {
      method: 'POST',
      body: JSON.stringify({ response }),
    }),
};

// Type alias — @simplewebauthn/browser already provides the real type; this avoids importing it here
type PublicKeyCredentialCreationOptionsJSON = Record<string, unknown>;
