import { useCallback, useEffect, useState } from 'react';
import { api, type Person } from '../lib/api';
import { useSession } from '../lib/session';
import { c, card, btn, btnGhost, overlay, modal, input as inputStyle, label as lblStyle } from '../lib/ui';

// Share a parent's name + phone via the native share sheet (PWA/mobile), with a
// WhatsApp / clipboard fallback on desktop browsers without the Web Share API.
async function shareContact(name: string | null, phone: string | null, title: string) {
  const text = [name, phone].filter(Boolean).join(' — ');
  if (!text) return;
  if (navigator.share) {
    try { await navigator.share({ title, text }); return; } catch { /* cancelled */ }
  }
  const digits = (phone || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (digits) {
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(name || '')}`, '_blank');
    return;
  }
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

  if (!teamId) return <p style={{ color: c.muted, padding: '2rem 0' }}>{t('noTeam')}</p>;

  return (
    <div style={{ padding: '1rem 0' }}>
      <h2 style={{ marginTop: 0 }}>{t('parents')}</h2>
      {loading ? (
        <p style={{ color: c.muted }}>{t('loading')}</p>
      ) : rows.length === 0 ? (
        <p style={{ color: c.muted }}>{t('empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {rows.map((p) => (
            <div key={p.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong>{name(p)}</strong>
                {editable && <button style={btnGhost} onClick={() => setEditing(p)}>{t('edit')}</button>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(12rem,1fr))', gap: '0.5rem' }}>
                <ParentCard label={t('father')} name={p.fatherName ?? null} phone={p.fatherPhone ?? null}
                  shareLabel={t('shareContact')} unknown={t('unknown')} share={t('share')} />
                <ParentCard label={t('mother')} name={p.motherName ?? null} phone={p.motherPhone ?? null}
                  shareLabel={t('shareContact')} unknown={t('unknown')} share={t('share')} />
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ParentsEditor
          player={editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            if (!teamId || !seasonId) return;
            await api.updatePerson('players', teamId, seasonId, editing.id, data);
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function ParentCard({ label, name, phone, share, shareLabel, unknown }: {
  label: string; name: string | null; phone: string | null;
  share: string; shareLabel: string; unknown: string;
}) {
  const has = name || phone;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '0.5rem', padding: '0.6rem' }}>
      <div style={{ color: c.muted, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{name || unknown}</div>
      <div style={{ color: c.muted, fontSize: '0.85rem' }}>{phone || unknown}</div>
      {has && (
        <button style={{ ...btnGhost, marginTop: '0.4rem', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
          onClick={() => shareContact(name, phone, shareLabel)}>
          📤 {share}
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
    e.preventDefault();
    setSaving(true);
    await onSave({
      fatherName: f.fatherName.trim() || null, fatherPhone: f.fatherPhone.trim() || null,
      motherName: f.motherName.trim() || null, motherPhone: f.motherPhone.trim() || null,
    });
  };

  const field = (label: string, k: keyof typeof f, type = 'text') => (
    <div>
      <label style={lblStyle}>{label}</label>
      <input style={inputStyle} type={type} value={f[k]} placeholder={t('unknown')}
        onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  return (
    <div style={overlay} onClick={onClose}>
      <form style={modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3 style={{ marginTop: 0 }}>{t('parents')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div style={{ gridColumn: '1 / -1', color: c.muted, fontSize: '0.8rem' }}>{t('father')}</div>
          {field(t('parentName'), 'fatherName')}
          {field(t('parentPhone'), 'fatherPhone', 'tel')}
          <div style={{ gridColumn: '1 / -1', color: c.muted, fontSize: '0.8rem' }}>{t('mother')}</div>
          {field(t('parentName'), 'motherName')}
          {field(t('parentPhone'), 'motherPhone', 'tel')}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" style={btnGhost} onClick={onClose}>{t('cancel')}</button>
          <button type="submit" style={btn} disabled={saving}>{saving ? t('loading') : t('save')}</button>
        </div>
      </form>
    </div>
  );
}
