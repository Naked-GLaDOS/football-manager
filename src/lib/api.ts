const BASE = '/api';

export type Kind = 'players' | 'staff';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('fm_token');
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('fm_token');
    window.dispatchEvent(new Event('fm-unauthorized'));
  }
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error((data as any)?.error ?? 'Request failed');
  return data as T;
}

const body = (data: unknown) => JSON.stringify(data);

// ── Domain types ──────────────────────────────────────────────────────────────

export interface Team { id: string; name: string; }

export interface Season {
  id: string; name: string; startDate: string; endDate: string; editable: boolean;
}

export interface Me { id: string; email: string; role: 'ADMIN' | 'USER'; teams: Team[]; }

export interface Person {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  birthDate: string | null;
  registrationNumber: string | null;
  preparationStartDate: string | null;
  birthTown: string | null;
  homeAddress: string | null;
  residenceTown: string | null;
  phone: string | null;
  email: string | null;
  // players only
  fatherName?: string | null;
  fatherPhone?: string | null;
  motherName?: string | null;
  motherPhone?: string | null;
}

export interface SeasonSettings {
  periods: number;
  periodMinutes: number;
  matchTypes: string[];
  maxSubstitutions: number;
  editable: boolean;
}

export type MatchEventType = 'SUBSTITUTION' | 'CARD' | 'GOAL';
export type CardColor = 'YELLOW' | 'RED';

export interface EventPlayer {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  period: number | null;
  minute: number | null;
  playerIn: EventPlayer | null;
  playerOut: EventPlayer | null;
  player: EventPlayer | null;
  card: CardColor | null;
  createdAt: string;
}

export interface Match {
  id: string;
  opponent: string;
  date: string;
  matchType: string;
  comment: string;
  events: MatchEvent[];
  createdAt: string;
  updatedAt: string;
}

// Payloads for creating an event (discriminated by `type`).
export type NewMatchEvent =
  | { type: 'SUBSTITUTION'; period: number; minute: number; playerInId: string; playerOutId: string }
  | { type: 'CARD'; period: number | null; minute: number | null; playerId: string; card: CardColor }
  | { type: 'GOAL'; period: number | null; minute: number | null; playerId: string };

export interface AdminUser {
  id: string; email: string; role: 'ADMIN' | 'USER'; teamIds: string[];
}
export interface AdminTeam {
  id: string; name: string;
  memberships: { user: { id: string; email: string } }[];
}

// ── API surface ───────────────────────────────────────────────────────────────

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; passkeyOptOut: boolean; role: 'ADMIN' | 'USER'; hasPasskey: boolean }>('/auth/login', {
      method: 'POST', body: body({ email, password }),
    }),
  passkeyOptOut: () => request<{ ok: boolean }>('/auth/passkey/opt-out', { method: 'POST' }),
  passkeyRegisterOptions: () =>
    request<Record<string, unknown>>('/auth/passkey/register/options', { method: 'POST' }),
  passkeyRegisterVerify: (response: unknown) =>
    request<{ verified: boolean }>('/auth/passkey/register/verify', {
      method: 'POST', body: body({ response }),
    }),
  passkeyLoginOptions: (email: string) =>
    request<Record<string, unknown>>('/auth/passkey/login/options', {
      method: 'POST', body: body({ email }),
    }),
  passkeyLoginVerify: (email: string, response: unknown) =>
    request<{ verified: boolean; token: string; passkeyOptOut: boolean; role: 'ADMIN' | 'USER'; hasPasskey: boolean }>(
      '/auth/passkey/login/verify', { method: 'POST', body: body({ email, response }) },
    ),

  // Session
  me: () => request<Me>('/me'),
  seasons: () => request<{ currentSeasonId: string; seasons: Season[] }>('/seasons'),

  // Roster (players / staff)
  roster: (kind: Kind, teamId: string, seasonId: string) =>
    request<Person[]>(`/teams/${teamId}/seasons/${seasonId}/${kind}`),
  createPerson: (kind: Kind, teamId: string, seasonId: string, data: Partial<Person>) =>
    request<Person>(`/teams/${teamId}/seasons/${seasonId}/${kind}`, { method: 'POST', body: body(data) }),
  updatePerson: (kind: Kind, teamId: string, seasonId: string, id: string, data: Partial<Person>) =>
    request<Person>(`/teams/${teamId}/seasons/${seasonId}/${kind}/${id}`, { method: 'PATCH', body: body(data) }),
  deletePerson: (kind: Kind, teamId: string, seasonId: string, id: string) =>
    request<{ ok: boolean }>(`/teams/${teamId}/seasons/${seasonId}/${kind}/${id}`, { method: 'DELETE' }),

  // Season settings (per team+season)
  settings: (teamId: string, seasonId: string) =>
    request<SeasonSettings>(`/teams/${teamId}/seasons/${seasonId}/settings`),
  updateSettings: (teamId: string, seasonId: string, data: Omit<SeasonSettings, 'editable'>) =>
    request<SeasonSettings>(`/teams/${teamId}/seasons/${seasonId}/settings`, { method: 'PUT', body: body(data) }),

  // Matches (per team+season)
  matches: (teamId: string, seasonId: string) =>
    request<Match[]>(`/teams/${teamId}/seasons/${seasonId}/matches`),
  createMatch: (teamId: string, seasonId: string, data: { opponent: string; date: string; matchType: string }) =>
    request<Match>(`/teams/${teamId}/seasons/${seasonId}/matches`, { method: 'POST', body: body(data) }),
  updateMatch: (teamId: string, seasonId: string, id: string, data: Partial<{ opponent: string; date: string; matchType: string; comment: string }>) =>
    request<Match>(`/teams/${teamId}/seasons/${seasonId}/matches/${id}`, { method: 'PATCH', body: body(data) }),
  deleteMatch: (teamId: string, seasonId: string, id: string) =>
    request<{ ok: boolean }>(`/teams/${teamId}/seasons/${seasonId}/matches/${id}`, { method: 'DELETE' }),
  addMatchEvent: (teamId: string, seasonId: string, matchId: string, data: NewMatchEvent) =>
    request<Match>(`/teams/${teamId}/seasons/${seasonId}/matches/${matchId}/events`, { method: 'POST', body: body(data) }),
  deleteMatchEvent: (teamId: string, seasonId: string, matchId: string, id: string) =>
    request<Match>(`/teams/${teamId}/seasons/${seasonId}/matches/${matchId}/events/${id}`, { method: 'DELETE' }),

  // Admin / CMS
  adminTeams: () => request<AdminTeam[]>('/admin/teams'),
  createTeam: (name: string) => request<Team>('/admin/teams', { method: 'POST', body: body({ name }) }),
  updateTeam: (id: string, name: string) =>
    request<Team>(`/admin/teams/${id}`, { method: 'PATCH', body: body({ name }) }),
  deleteTeam: (id: string) => request<{ ok: boolean }>(`/admin/teams/${id}`, { method: 'DELETE' }),

  adminUsers: () => request<AdminUser[]>('/admin/users'),
  createUser: (email: string, password: string, teamIds: string[]) =>
    request<AdminUser>('/admin/users', { method: 'POST', body: body({ email, password, teamIds }) }),
  updateUser: (id: string, data: { email?: string; password?: string; teamIds?: string[] }) =>
    request<{ ok: boolean }>(`/admin/users/${id}`, { method: 'PATCH', body: body(data) }),
  deleteUser: (id: string) => request<{ ok: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),
};
