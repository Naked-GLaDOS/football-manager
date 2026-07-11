import { useState } from 'react';
import type { Kind, Person } from '../lib/api';
import { useSession } from '../lib/session';
import { fieldsFor } from '../lib/fields';
import { PLAYER_ROLES, STAFF_ROLES, type TKey } from '../lib/i18n';
import { c, overlay, modal, input as inputStyle, label as lblStyle, btn, btnGhost } from '../lib/ui';

// Convert an ISO datetime (or null) to the YYYY-MM-DD a <input type=date> wants.
const toDateInput = (v: string | null | undefined) => (v ? v.slice(0, 10) : '');

export default function PersonForm({
  kind, initial, readOnly, onSave, onClose,
}: {
  kind: Kind;
  initial: Person | null;
  readOnly: boolean;
  onSave: (data: Partial<Person>) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useSession();
  const fields = fieldsFor(kind);
  const roleOptions = kind === 'players' ? PLAYER_ROLES : STAFF_ROLES;

  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) {
      const raw = (initial as any)?.[f.key];
      init[f.key] = f.type === 'date' ? toDateInput(raw) : (raw ?? '');
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    // Empty string => null (Unknown).
    const data: Record<string, unknown> = {};
    for (const f of fields) {
      const v = form[f.key]?.trim();
      data[f.key] = v ? v : null;
    }
    try {
      await onSave(data as Partial<Person>);
    } catch (err: any) {
      setError(err.message || 'Error');
      setSaving(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <form style={modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 style={{ marginTop: 0, color: c.text }}>
          {readOnly ? '' : initial ? t('edit') : t('add')}{' '}
          {kind === 'players' ? t('players') : t('staff')}
        </h2>

        <div style={grid}>
          {fields.map((f) => (
            <div key={f.key}>
              <label style={lblStyle}>{t(f.key as TKey)}</label>
              {f.type === 'role' ? (
                <select style={inputStyle} value={form[f.key]} disabled={readOnly}
                  onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">{t('unknown')}</option>
                  {roleOptions.map((r) => <option key={r} value={r}>{t(r as TKey)}</option>)}
                </select>
              ) : (
                <input
                  style={inputStyle}
                  type={f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'}
                  value={form[f.key]}
                  disabled={readOnly}
                  placeholder={t('unknown')}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        {error && <p style={{ color: c.danger, fontSize: '0.85rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" style={btnGhost} onClick={onClose}>
            {readOnly ? t('cancel') : t('cancel')}
          </button>
          {!readOnly && (
            <button type="submit" style={btn} disabled={saving}>
              {saving ? t('loading') : t('save')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

const grid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))', gap: '0.75rem',
};
