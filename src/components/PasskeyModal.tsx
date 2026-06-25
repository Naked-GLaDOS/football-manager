import { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { api } from '../lib/api';

interface Props {
  onDone: () => void;
}

export default function PasskeyModal({ onDone }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const options = await api.passkeyRegisterOptions();
      const response = await startRegistration({ optionsJSON: options as any });
      const result = await api.passkeyRegisterVerify(response);
      if (result.verified) {
        setStatus('success');
        setTimeout(onDone, 1500);
      } else {
        throw new Error('Verification failed');
      }
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e.message ?? 'Something went wrong');
    }
  };

  const handleNo = () => onDone();

  const handleOptOut = async () => {
    await api.passkeyOptOut().catch(() => {});
    onDone();
  };

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={iconWrap}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8">
            <path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2z" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            <circle cx="19" cy="13" r="3" fill="#16a34a" stroke="none" />
            <path d="M19 11v4M17 13h4" stroke="#0f172a" strokeWidth="1.5" />
          </svg>
        </div>

        <h2 style={title}>Set up a passkey?</h2>
        <p style={subtitle}>
          Passkeys let you sign in with your face, fingerprint, or device PIN — no password needed next time.
        </p>

        {status === 'success' && <p style={successMsg}>Passkey created!</p>}
        {status === 'error' && <p style={errorStyle}>{errorMsg}</p>}

        <div style={btnGroup}>
          <button style={primaryBtn} onClick={handleCreate} disabled={status === 'loading' || status === 'success'}>
            {status === 'loading' ? 'Setting up…' : 'Create passkey'}
          </button>
          <button style={ghostBtn} onClick={handleNo}>Not now</button>
          <button style={mutedBtn} onClick={handleOptOut}>Don't ask again</button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 50, padding: '1rem',
};

const card: React.CSSProperties = {
  background: '#1e293b', borderRadius: '1rem', padding: '2rem',
  maxWidth: '22rem', width: '100%', textAlign: 'center',
  boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
};

const iconWrap: React.CSSProperties = { marginBottom: '1rem' };

const title: React.CSSProperties = {
  color: '#f1f5f9', fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem',
};

const subtitle: React.CSSProperties = {
  color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.5rem',
};

const btnGroup: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '0.625rem',
};

const primaryBtn: React.CSSProperties = {
  background: '#16a34a', color: '#fff', border: 'none', borderRadius: '0.5rem',
  padding: '0.75rem', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  background: 'transparent', color: '#cbd5e1', border: '1px solid #334155',
  borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.9375rem', cursor: 'pointer',
};

const mutedBtn: React.CSSProperties = {
  background: 'transparent', color: '#64748b', border: 'none',
  fontSize: '0.8125rem', cursor: 'pointer', padding: '0.25rem',
};

const successMsg: React.CSSProperties = { color: '#4ade80', marginBottom: '1rem', fontWeight: 600 };
const errorStyle: React.CSSProperties = { color: '#f87171', marginBottom: '1rem', fontSize: '0.875rem' };
