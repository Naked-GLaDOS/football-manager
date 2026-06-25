import { useState } from 'react';
import { api } from './lib/api';
import PasskeyModal from './components/PasskeyModal';

type Mode = 'login' | 'register';
type Screen = 'auth' | 'passkey' | 'app';

export default function App() {
  const [mode, setMode] = useState<Mode>('login');
  const [screen, setScreen] = useState<Screen>(
    localStorage.getItem('fm_token') ? 'app' : 'auth'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register' && password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = mode === 'login'
        ? await api.login(email, password)
        : await api.register(email, password);

      localStorage.setItem('fm_token', res.token);
      setScreen(res.passkeyOptOut ? 'app' : 'passkey');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('fm_token');
    setScreen('auth');
    setEmail('');
    setPassword('');
    setConfirm('');
  };

  if (screen === 'app') {
    return (
      <main style={appShell}>
        <h1 style={appTitle}>Football Manager</h1>
        <button style={logoutBtn} onClick={logout}>Sign out</button>
      </main>
    );
  }

  return (
    <>
      <main style={authShell}>
        <div style={authCard}>
          <div style={logo}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="18" fill="#16a34a" />
              <circle cx="18" cy="18" r="10" fill="white" />
              <circle cx="18" cy="18" r="4" fill="#0f172a" />
            </svg>
          </div>
          <h1 style={cardTitle}>Football Manager</h1>

          <div style={tabRow}>
            <button style={tab(mode === 'login')} onClick={() => { setMode('login'); setError(''); }}>
              Sign in
            </button>
            <button style={tab(mode === 'register')} onClick={() => { setMode('register'); setError(''); }}>
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} style={form}>
            <label style={labelStyle}>Email</label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              style={input} placeholder="you@example.com"
            />

            <label style={labelStyle}>Password</label>
            <input
              type="password" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password} onChange={e => setPassword(e.target.value)}
              style={input} placeholder="••••••••"
            />

            {mode === 'register' && (
              <>
                <label style={labelStyle}>Confirm password</label>
                <input
                  type="password" required autoComplete="new-password"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  style={input} placeholder="••••••••"
                />
              </>
            )}

            {error && <p style={errorStyle}>{error}</p>}

            <button type="submit" style={submitBtn} disabled={loading}>
              {loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </main>

      {screen === 'passkey' && (
        <PasskeyModal onDone={() => setScreen('app')} />
      )}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const authShell: React.CSSProperties = {
  minHeight: '100dvh', background: '#0f172a',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
};

const authCard: React.CSSProperties = {
  background: '#1e293b', borderRadius: '1rem', padding: '2rem',
  maxWidth: '22rem', width: '100%',
  boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
};

const logo: React.CSSProperties = { textAlign: 'center', marginBottom: '0.75rem' };

const cardTitle: React.CSSProperties = {
  color: '#f1f5f9', fontSize: '1.25rem', fontWeight: 700,
  textAlign: 'center', margin: '0 0 1.25rem',
};

const tabRow: React.CSSProperties = {
  display: 'flex', background: '#0f172a', borderRadius: '0.5rem',
  padding: '0.25rem', marginBottom: '1.5rem', gap: '0.25rem',
};

const tab = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: '0.5rem', borderRadius: '0.375rem', border: 'none',
  background: active ? '#16a34a' : 'transparent',
  color: active ? '#fff' : '#94a3b8',
  fontWeight: active ? 600 : 400, fontSize: '0.875rem', cursor: 'pointer',
  transition: 'all 0.15s',
});

const form: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.375rem' };

const labelStyle: React.CSSProperties = {
  color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 500, marginTop: '0.5rem',
};

const input: React.CSSProperties = {
  background: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem',
  color: '#f1f5f9', padding: '0.625rem 0.75rem', fontSize: '0.9375rem',
  outline: 'none', width: '100%',
};

const errorStyle: React.CSSProperties = {
  color: '#f87171', fontSize: '0.8125rem', margin: '0.25rem 0',
};

const submitBtn: React.CSSProperties = {
  marginTop: '1rem', background: '#16a34a', color: '#fff',
  border: 'none', borderRadius: '0.5rem', padding: '0.75rem',
  fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer',
};

const appShell: React.CSSProperties = {
  minHeight: '100dvh', background: '#0f172a', color: '#f1f5f9',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem',
};

const appTitle: React.CSSProperties = { fontSize: '2rem', color: '#16a34a', fontWeight: 800 };

const logoutBtn: React.CSSProperties = {
  background: 'transparent', border: '1px solid #334155', color: '#94a3b8',
  borderRadius: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer',
};
