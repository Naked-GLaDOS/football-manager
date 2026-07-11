import { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import PasskeyModal from '../components/PasskeyModal';
import { c, input as inputStyle, btn } from '../lib/ui';

export default function Login() {
  const { t, onLogin, lang, setLang } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);

  const finish = async () => { await onLogin(); };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(email, password);
      localStorage.setItem('fm_token', res.token);
      // Only offer passkey setup when the user has none and hasn't opted out —
      // otherwise it would re-prompt (and error) on every login.
      if (res.hasPasskey || res.passkeyOptOut) await finish();
      else setShowPasskey(true);
    } catch (err: any) {
      setError(err.message || t('invalidLogin'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError('');
    if (!email) { setError(t('email')); return; }
    setLoading(true);
    try {
      const options = await api.passkeyLoginOptions(email);
      const response = await startAuthentication({ optionsJSON: options as any });
      const res = await api.passkeyLoginVerify(email, response);
      localStorage.setItem('fm_token', res.token);
      await finish();
    } catch (err: any) {
      setError(err.message || 'Passkey sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main style={shell}>
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            <svg width="40" height="40" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="18" fill={c.green} />
              <circle cx="18" cy="18" r="10" fill="white" />
              <circle cx="18" cy="18" r="4" fill={c.bg} />
            </svg>
          </div>
          <h1 style={title}>{t('appName')}</h1>

          <form onSubmit={handlePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div>
              <label style={lbl}>{t('email')}</label>
              <input type="email" required autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="you@example.com" />
            </div>
            <div>
              <label style={lbl}>{t('password')}</label>
              <input type="password" required autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
            </div>

            {error && <p style={{ color: c.danger, fontSize: '0.85rem', margin: 0 }}>{error}</p>}

            <button type="submit" style={{ ...btn, marginTop: '0.5rem' }} disabled={loading}>
              {loading ? t('loading') : t('signIn')}
            </button>
            <button type="button" onClick={handlePasskeyLogin} disabled={loading}
              style={{ ...btn, background: 'transparent', color: c.text, border: `1px solid ${c.border}` }}>
              🔑 {t('usePasskey')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button onClick={() => setLang(lang === 'it' ? 'en' : 'it')} style={langToggle}>
              {lang === 'it' ? '🇬🇧 English' : '🇮🇹 Italiano'}
            </button>
          </div>
        </div>
      </main>

      {showPasskey && <PasskeyModal onDone={finish} />}
    </>
  );
}

const shell: React.CSSProperties = {
  minHeight: '100dvh', background: c.bg, display: 'flex',
  alignItems: 'center', justifyContent: 'center', padding: '1rem',
};
const card: React.CSSProperties = {
  background: c.card, borderRadius: '1rem', padding: '2rem', maxWidth: '22rem', width: '100%',
  boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
};
const title: React.CSSProperties = {
  color: c.text, fontSize: '1.25rem', fontWeight: 700, textAlign: 'center', margin: '0 0 1.25rem',
};
const lbl: React.CSSProperties = { color: c.muted, fontSize: '0.8rem', marginBottom: '0.25rem', display: 'block' };
const langToggle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: c.muted, fontSize: '0.85rem', cursor: 'pointer',
};
