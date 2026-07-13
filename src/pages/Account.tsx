import { useCallback, useEffect, useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { api, type AccountProfile, type AccountPasskey, type AccountSession, type Theme } from '../lib/api';
import { useSession } from '../lib/session';
import { useNav } from '../lib/nav';
import { pushSupported, isSubscribed, subscribeToPush, unsubscribeFromPush } from '../lib/push';
import type { Lang } from '../lib/i18n';
import {
  IconBack, IconKey, IconTrash, IconEdit, IconCheck, IconDevice, IconLock,
  IconSun, IconMoon, IconPlus, IconBell,
} from '../components/Icons';

const APP_VERSION = '1.2.0';

// A labelled on/off switch used across the notification & (implicitly) other rows.
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      <span className="thumb" />
    </label>
  );
}

// Friendly device name from a User-Agent string (best-effort).
function deviceName(ua: string | null): string {
  if (!ua) return '';
  const browser =
    /Edg/i.test(ua) ? 'Edge' :
    /OPR|Opera/i.test(ua) ? 'Opera' :
    /Chrome/i.test(ua) ? 'Chrome' :
    /Firefox/i.test(ua) ? 'Firefox' :
    /Safari/i.test(ua) ? 'Safari' : '';
  const os =
    /iPhone|iPad|iOS/i.test(ua) ? 'iOS' :
    /Android/i.test(ua) ? 'Android' :
    /Mac OS X|Macintosh/i.test(ua) ? 'macOS' :
    /Windows/i.test(ua) ? 'Windows' :
    /Linux/i.test(ua) ? 'Linux' : '';
  return [browser, os].filter(Boolean).join(' · ');
}

function relTime(iso: string, lang: Lang): string {
  const diff = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const min = Math.round(diff / 60000);
  if (Math.abs(min) < 60) return rtf.format(-min, 'minute');
  const hr = Math.round(min / 60);
  if (Math.abs(hr) < 24) return rtf.format(-hr, 'hour');
  return rtf.format(-Math.round(hr / 24), 'day');
}

export default function Account() {
  const s = useSession();
  const { t, lang } = s;
  const nav = useNav();

  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProfile(await api.account());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading || !profile) return <p className="empty">{t('loading')}</p>;

  return (
    <div>
      <div className="section-head">
        <button className="btn btn-ghost btn-sm" onClick={() => nav.close()}><IconBack /> {t('back')}</button>
        <h2 className="title" style={{ flex: 1 }}>{t('accountSettings')}</h2>
      </div>

      <ProfileCard profile={profile} onSaved={setProfile} />
      <PasswordCard />
      <PasskeysCard />
      <NotificationsCard profile={profile} onChange={setProfile} />
      <AppearanceCard theme={s.theme} setTheme={s.setTheme} lang={lang} setLang={s.setLang} />
      <SessionsCard lang={lang} />
    </div>
  );
}

// ── Profile / account info ────────────────────────────────────────────────────
function ProfileCard({ profile, onSaved }: { profile: AccountProfile; onSaved: (p: AccountProfile) => void }) {
  const { t, lang } = useSession();
  const [name, setName] = useState(profile.name ?? '');
  const [email, setEmail] = useState(profile.email);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const dirty = name !== (profile.name ?? '') || email.trim().toLowerCase() !== profile.email;

  const save = async () => {
    setSaving(true); setError('');
    try {
      const updated = await api.updateAccount({ name: name.trim() || null, email: email.trim() });
      onSaved({ ...profile, name: updated.name, email: updated.email });
      setSaved(true); window.setTimeout(() => setSaved(false), 1600);
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '0.9rem' }}>
      <h3 className="settings-heading">{t('profile')}</h3>
      <div className="grid-fields">
        <div className="field">
          <label>{t('displayName')}</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="—" />
        </div>
        <div className="field">
          <label>{t('email')}</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      <div className="detail-list" style={{ marginTop: '0.9rem' }}>
        <div className="detail-row">
          <div className="detail-main">
            <div className="detail-label">{t('role')}</div>
            <div className="detail-value">{profile.role === 'ADMIN' ? t('cms') : t('players')}</div>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-main">
            <div className="detail-label">{t('team')}</div>
            <div className="detail-value">{profile.teams.map((tm) => tm.name).join(', ') || '—'}</div>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-main">
            <div className="detail-label">{t('memberSince')}</div>
            <div className="detail-value">{new Date(profile.createdAt).toLocaleDateString(lang)}</div>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-main">
            <div className="detail-label">{t('appVersion')}</div>
            <div className="detail-value muted">{APP_VERSION}</div>
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary" onClick={save} disabled={saving || !dirty} style={{ marginTop: '0.9rem' }}>
        {saved ? <><IconCheck /> {t('saved')}</> : saving ? t('loading') : t('saveChanges')}
      </button>
    </div>
  );
}

// ── Password ──────────────────────────────────────────────────────────────────
function PasswordCard() {
  const { t } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (next.length < 8) { setError(t('newPassword') + ' ≥ 8'); return; }
    if (next !== confirm) { setError(t('passwordsDontMatch')); return; }
    setSaving(true);
    try {
      await api.changePassword(current, next);
      setDone(true); setCurrent(''); setNext(''); setConfirm('');
      window.setTimeout(() => setDone(false), 2000);
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '0.9rem' }}>
      <h3 className="settings-heading"><IconLock size={16} /> {t('passwordSection')}</h3>
      <div className="stack">
        <div className="field">
          <label>{t('currentPassword')}</label>
          <input className="input" type="password" autoComplete="current-password"
            value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="grid-fields">
          <div className="field">
            <label>{t('newPassword')}</label>
            <input className="input" type="password" autoComplete="new-password"
              value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="field">
            <label>{t('confirmPassword')}</label>
            <input className="input" type="password" autoComplete="new-password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary" onClick={submit}
        disabled={saving || !current || !next || !confirm} style={{ marginTop: '0.9rem' }}>
        {done ? <><IconCheck /> {t('passwordChanged')}</> : saving ? t('loading') : t('updatePassword')}
      </button>
    </div>
  );
}

// ── Passkeys ──────────────────────────────────────────────────────────────────
function PasskeysCard() {
  const { t, lang } = useSession();
  const [items, setItems] = useState<AccountPasskey[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => { setItems(await api.accountPasskeys()); }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    setBusy(true); setError('');
    try {
      const options = await api.passkeyRegisterOptions();
      const response = await startRegistration({ optionsJSON: options as any });
      const result = await api.passkeyRegisterVerify(response);
      if (!result.verified) throw new Error('Verification failed');
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const rename = async (pk: AccountPasskey) => {
    const name = window.prompt(t('renameLabel'), pk.name ?? '');
    if (name == null) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    await api.renamePasskey(pk.id, trimmed).catch(() => {});
    await load();
  };

  const remove = async (pk: AccountPasskey) => {
    if (!window.confirm(t('confirmDelete'))) return;
    await api.deletePasskey(pk.id).catch(() => {});
    await load();
  };

  return (
    <div className="card" style={{ marginBottom: '0.9rem' }}>
      <h3 className="settings-heading"><IconKey size={16} /> {t('passkeys')}</h3>
      <p className="muted" style={{ fontSize: '0.82rem', margin: '0 0 0.6rem' }}>{t('passkeysHint')}</p>

      {items === null ? <p className="muted">{t('loading')}</p> : items.length === 0 ? (
        <p className="muted">{t('noPasskeys')}</p>
      ) : (
        <div>
          {items.map((pk) => (
            <div className="list-row" key={pk.id}>
              <div className="avatar" style={{ width: 34, height: 34 }}><IconKey size={16} /></div>
              <div className="row-main">
                <div className="row-title">{pk.name || 'Passkey'}</div>
                <div className="row-sub">
                  {t('createdOn')} {new Date(pk.createdAt).toLocaleDateString(lang)}
                  {' · '}{t('lastUsed')}: {pk.lastUsedAt ? relTime(pk.lastUsedAt, lang) : t('never')}
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" title={t('renameLabel')} onClick={() => rename(pk)}>
                <IconEdit />
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" title={t('delete')} onClick={() => remove(pk)}>
                <IconTrash />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="error">{error}</p>}
      <button className="btn btn-ghost" onClick={add} disabled={busy} style={{ marginTop: '0.9rem' }}>
        <IconPlus /> {busy ? t('loading') : t('addPasskey')}
      </button>
    </div>
  );
}

// ── Notifications ─────────────────────────────────────────────────────────────
function NotificationsCard({ profile, onChange }: { profile: AccountProfile; onChange: (p: AccountProfile) => void }) {
  const { t } = useSession();
  const supported = pushSupported();
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [note, setNote] = useState('');
  const [tested, setTested] = useState(false);

  useEffect(() => {
    if (supported) isSubscribed().then(setPushOn).catch(() => {});
  }, [supported]);

  const togglePush = async (v: boolean) => {
    setPushBusy(true); setNote('');
    try {
      if (v) { await subscribeToPush(); setPushOn(true); }
      else { await unsubscribeFromPush(); setPushOn(false); }
    } catch (e: any) {
      const msg = e?.message;
      if (msg === 'denied' || Notification.permission === 'denied') setNote(t('notificationsBlocked'));
      else if (msg === 'server-push-disabled') setNote(t('pushDisabledServer'));
      else setNote(t('notificationsUnsupported'));
      setPushOn(false);
    } finally {
      setPushBusy(false);
    }
  };

  const setPref = async (key: 'notifyFormationReminder' | 'notifyMatchDataReminder', v: boolean) => {
    onChange({ ...profile, [key]: v });
    await api.updateAccount({ [key]: v }).catch(() => {});
  };

  const sendTest = async () => {
    await api.pushTest().catch(() => {});
    setTested(true); window.setTimeout(() => setTested(false), 2000);
  };

  return (
    <div className="card" style={{ marginBottom: '0.9rem' }}>
      <h3 className="settings-heading"><IconBell size={16} /> {t('notifications')}</h3>

      {!supported ? (
        <p className="muted">{t('notificationsUnsupported')}</p>
      ) : (
        <div className="setting-row">
          <div className="setting-main">
            <div className="setting-label">{t('enableNotifications')}</div>
            {note && <div className="setting-hint" style={{ color: 'var(--danger)' }}>{note}</div>}
          </div>
          <Toggle checked={pushOn} disabled={pushBusy} onChange={togglePush} />
        </div>
      )}

      <div className="setting-row">
        <div className="setting-main">
          <div className="setting-label">{t('formationReminder')}</div>
          <div className="setting-hint">{t('formationReminderHint')}</div>
        </div>
        <Toggle checked={profile.notifyFormationReminder} onChange={(v) => setPref('notifyFormationReminder', v)} />
      </div>

      <div className="setting-row">
        <div className="setting-main">
          <div className="setting-label">{t('matchDataReminder')}</div>
          <div className="setting-hint">{t('matchDataReminderHint')}</div>
        </div>
        <Toggle checked={profile.notifyMatchDataReminder} onChange={(v) => setPref('notifyMatchDataReminder', v)} />
      </div>

      <button className="btn btn-ghost" onClick={sendTest} style={{ marginTop: '0.9rem' }}>
        {tested ? <><IconCheck /> {t('testSent')}</> : <><IconBell size={16} /> {t('testNotification')}</>}
      </button>
    </div>
  );
}

// ── Appearance (theme + language) ─────────────────────────────────────────────
function AppearanceCard({
  theme, setTheme, lang, setLang,
}: { theme: Theme; setTheme: (t: Theme) => void; lang: Lang; setLang: (l: Lang) => void }) {
  const { t } = useSession();
  return (
    <div className="card" style={{ marginBottom: '0.9rem' }}>
      <h3 className="settings-heading">{t('appearance')}</h3>

      <div className="setting-row">
        <div className="setting-main"><div className="setting-label">{t('theme')}</div></div>
        <div className="segmented">
          <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>
            <IconMoon size={15} /> {t('themeDark')}
          </button>
          <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>
            <IconSun size={15} /> {t('themeLight')}
          </button>
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-main"><div className="setting-label">{t('language')}</div></div>
        <div className="segmented">
          <button className={lang === 'it' ? 'active' : ''} onClick={() => setLang('it')}>IT</button>
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
        </div>
      </div>
    </div>
  );
}

// ── Active sessions ───────────────────────────────────────────────────────────
function SessionsCard({ lang }: { lang: Lang }) {
  const { t } = useSession();
  const [items, setItems] = useState<AccountSession[] | null>(null);

  const load = useCallback(async () => { setItems(await api.sessions()); }, []);
  useEffect(() => { load(); }, [load]);

  const revoke = async (id: string) => { await api.revokeSession(id).catch(() => {}); await load(); };
  const revokeOthers = async () => { await api.revokeOtherSessions().catch(() => {}); await load(); };

  const hasOthers = (items ?? []).some((sn) => !sn.current);

  return (
    <div className="card" style={{ marginBottom: '0.9rem' }}>
      <h3 className="settings-heading"><IconDevice size={16} /> {t('activeSessions')}</h3>

      {items === null ? <p className="muted">{t('loading')}</p> : (
        <div>
          {items.map((sn) => (
            <div className="list-row" key={sn.id}>
              <div className="avatar" style={{ width: 34, height: 34 }}><IconDevice size={16} /></div>
              <div className="row-main">
                <div className="row-title">
                  {deviceName(sn.userAgent) || t('unknownDevice')}
                  {sn.current && <span className="badge" style={{ marginLeft: 6 }}>{t('thisDevice')}</span>}
                </div>
                <div className="row-sub">
                  {sn.ip || '—'} · {t('lastActive')} {relTime(sn.lastSeenAt, lang)}
                </div>
              </div>
              {!sn.current && (
                <button className="btn btn-ghost btn-sm" onClick={() => revoke(sn.id)}>{t('revoke')}</button>
              )}
            </div>
          ))}
        </div>
      )}

      {hasOthers && (
        <button className="btn btn-danger" onClick={revokeOthers} style={{ marginTop: '0.9rem' }}>
          {t('signOutOthers')}
        </button>
      )}
    </div>
  );
}
