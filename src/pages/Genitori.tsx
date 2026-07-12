import { useCallback, useEffect, useState } from 'react';
import { api, type Person } from '../lib/api';
import { useSession } from '../lib/session';
import { IconShare, IconEdit } from '../components/Icons';

// Share a pre-built, localised contact line (e.g. `Padre di "Rossi Mario": Francesco — 12345`)
// via the native share sheet (PWA/mobile), with a WhatsApp / clipboard fallback on desktop
// browsers without the Web Share API.
async function shareContact(text: string, phone: string | null, title: string) {
  if (!text) return;
  if (navigator.share) {
    try { await navigator.share({ title, text }); return; } catch { /* cancelled */ }
  }
  const digits = (phone || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (digits) { window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, '_blank'); return; }
  try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
}

export default function Genitori() {
  const s = useSession();
  const { t, teamId, seasonId, editable } = s;
  const [rows, setRows] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Person | null>(null);

  const load = useCallback(async () => {
    if (!teamId || !seasonId) return;
    setLoading(true);
    try { setRows(await api.roster('players', teamId, seasonId)); }
    finally { setLoading(false); }
  }, [teamId, seasonId]);

  useEffect(() => { load(); }, [load]);

  const name = (p: Person) => [p.lastName, p.firstName].filter(Boolean).join(' ') || t('unknown');

  if (!teamId) return <p className="empty">{t('noTeam')}</p>;

  return (
    <div>
      <div className="section-head"><h2 className="title">{t('parents')}</h2></div>

      {loading ? (
        <p className="empty">{t('loading')}</p>
      ) : rows.length === 0 ? (
        <p className="empty">{t('empty')}</p>
      ) : (
        <div className="stack">
          {rows.map((p) => (
            <div key={p.id} className="card">
              <div className="row" style={{ marginBottom: '0.7rem' }}>
                <strong className="row-main">{name(p)}</strong>
                {editable && (
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(p)} title={t('edit')}>
                    <IconEdit />
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(11rem,1fr))', gap: '0.6rem' }}>
                <ParentCard label={t('father')} of={t('parentOf')} player={name(p)}
                  name={p.fatherName ?? null} phone={p.fatherPhone ?? null}
                  shareLabel={t('shareContact')} unknown={t('unknown')} share={t('share')} />
                <ParentCard label={t('mother')} of={t('parentOf')} player={name(p)}
                  name={p.motherName ?? null} phone={p.motherPhone ?? null}
                  shareLabel={t('shareContact')} unknown={t('unknown')} share={t('share')} />
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ParentsEditor player={editing} onClose={() => setEditing(null)}
          onSave={async (data) => {
            if (!teamId || !seasonId) return;
            await api.updatePerson('players', teamId, seasonId, editing.id, data);
            setEditing(null); await load();
          }} />
      )}
    </div>
  );
}

function ParentCard({ label, of, player, name, phone, share, shareLabel, unknown }: {
  label: string; of: string; player: string; name: string | null; phone: string | null;
  share: string; shareLabel: string; unknown: string;
}) {
  const has = name || phone;
  // e.g. `Padre di "Rossi Mario": Francesco — 12345` (localised via `label` and `of`)
  const prefix = `${label} ${of} "${player}"`;
  const contact = [name, phone].map((v) => v?.trim()).filter(Boolean).join(' — ');
  const shareText = contact ? `${prefix}: ${contact}` : prefix;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
      borderRadius: '13px', padding: '0.7rem 0.8rem',
    }}>
      <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontWeight: 600, marginTop: '0.15rem' }}>{name || unknown}</div>
      <div className="muted" style={{ fontSize: '0.85rem' }}>{phone || unknown}</div>
      {has && (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.55rem', width: '100%' }}
          onClick={() => shareContact(shareText, phone, shareLabel)}>
          <IconShare /> {share}
        </button>
      )}
    </div>
  );
}

function ParentsEditor({ player, onSave, onClose }: {
  player: Person; onSave: (d: Partial<Person>) => Promise<void>; onClose: () => void;
}) {
  const { t } = useSession();
  const [f, setF] = useState({
    fatherName: player.fatherName ?? '', fatherPhone: player.fatherPhone ?? '',
    motherName: player.motherName ?? '', motherPhone: player.motherPhone ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    await onSave({
      fatherName: f.fatherName.trim() || null, fatherPhone: f.fatherPhone.trim() || null,
      motherName: f.motherName.trim() || null, motherPhone: f.motherPhone.trim() || null,
    });
  };

  const field = (label: string, k: keyof typeof f, type = 'text') => (
    <div className="field">
      <label>{label}</label>
      <input className="input" type={type} value={f[k]} placeholder={t('unknown')} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="sheet-grip" />
        <h3 className="title" style={{ marginBottom: '1rem' }}>{t('parents')}</h3>
        <div className="muted" style={{ fontSize: '0.78rem', marginBottom: '0.4rem' }}>{t('father')}</div>
        <div className="grid-fields" style={{ marginBottom: '1rem' }}>
          {field(t('parentName'), 'fatherName')}
          {field(t('parentPhone'), 'fatherPhone', 'tel')}
        </div>
        <div className="muted" style={{ fontSize: '0.78rem', marginBottom: '0.4rem' }}>{t('mother')}</div>
        <div className="grid-fields">
          {field(t('parentName'), 'motherName')}
          {field(t('parentPhone'), 'motherPhone', 'tel')}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('loading') : t('save')}</button>
        </div>
      </form>
    </div>
  );
}
