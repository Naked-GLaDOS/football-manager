import { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import PasskeyModal from '../components/PasskeyModal';
import { IconKey } from '../components/Icons';

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
    setError(''); setLoading(true);
    try {
      const res = await api.login(email, password);
      localStorage.setItem('fm_token', res.token);
      // Only offer passkey setup when the user has none and hasn't opted out.
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
      <main className="auth">
        <div className="auth-card glass">
          <div className="logo-badge">
            <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="17" fill="#22c55e" />
              <circle cx="18" cy="18" r="9.5" fill="#0d1526" />
              <circle cx="18" cy="18" r="3.5" fill="#22c55e" />
            </svg>
          </div>
          <h1 className="title" style={{ marginBottom: '0.35rem' }}>{t('appName')}</h1>
          <p className="muted" style={{ margin: '0 0 1.4rem', fontSize: '0.9rem' }}>
            {lang === 'it' ? 'Accedi al tuo account' : 'Sign in to your account'}
          </p>

          <form onSubmit={handlePassword} className="stack" style={{ textAlign: 'left' }}>
            <div className="field">
              <label>{t('email')}</label>
              <input className="input" type="email" required autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="field">
              <label>{t('password')}</label>
              <input className="input" type="password" required autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            {error && <p className="error">{error}</p>}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.3rem' }}>
              {loading ? t('loading') : t('signIn')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={handlePasskeyLogin} disabled={loading}>
              <IconKey /> {t('usePasskey')}
            </button>
          </form>

          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }}
            onClick={() => setLang(lang === 'it' ? 'en' : 'it')}
            aria-label={lang === 'it' ? 'Cambia lingua' : 'Change language'}>
            🌐 {lang === 'it' ? '🇮🇹 Italiano' : '🇬🇧 English'}
          </button>
        </div>
      </main>

      {showPasskey && <PasskeyModal onDone={finish} />}
    </>
  );
}
