import { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { useBackDismiss } from '../lib/backnav';
import { IconKey } from './Icons';

interface Props {
  onDone: () => void;
}

export default function PasskeyModal({ onDone }: Props) {
  const { t, lang } = useSession();
  useBackDismiss(true, onDone);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = async () => {
    setStatus('loading'); setErrorMsg('');
    try {
      const options = await api.passkeyRegisterOptions();
      const response = await startRegistration({ optionsJSON: options as any });
      const result = await api.passkeyRegisterVerify(response);
      if (result.verified) {
        setStatus('success');
        setTimeout(onDone, 1200);
      } else throw new Error('Verification failed');
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e.message ?? 'Something went wrong');
    }
  };

  const handleOptOut = async () => {
    await api.passkeyOptOut().catch(() => {});
    onDone();
  };

  const it = lang === 'it';

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: '22rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="logo-badge" style={{ color: 'var(--accent)' }}><IconKey size={30} /></div>
        <h2 className="title" style={{ marginBottom: '0.4rem' }}>
          {it ? 'Configura una passkey?' : 'Set up a passkey?'}
        </h2>
        <p className="muted" style={{ fontSize: '0.9rem', margin: '0 0 1.3rem', lineHeight: 1.55 }}>
          {it
            ? 'Le passkey ti fanno accedere con volto, impronta o PIN del dispositivo — senza password la prossima volta.'
            : 'Passkeys let you sign in with your face, fingerprint, or device PIN — no password needed next time.'}
        </p>

        {status === 'success' && <p style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: '1rem' }}>{it ? 'Passkey creata!' : 'Passkey created!'}</p>}
        {status === 'error' && <p className="error" style={{ marginBottom: '1rem' }}>{errorMsg}</p>}

        <div className="stack">
          <button className="btn btn-primary" onClick={handleCreate} disabled={status === 'loading' || status === 'success'}>
            {status === 'loading' ? t('loading') : (it ? 'Crea passkey' : 'Create passkey')}
          </button>
          <button className="btn btn-ghost" onClick={onDone}>{it ? 'Non ora' : 'Not now'}</button>
          <button className="btn btn-sm" style={{ background: 'none', color: 'var(--muted)' }} onClick={handleOptOut}>
            {it ? 'Non chiedere più' : "Don't ask again"}
          </button>
        </div>
      </div>
    </div>
  );
}
