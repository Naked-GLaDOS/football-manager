import { useState } from 'react';
import type { Kind, Person } from '../lib/api';
import { useSession } from '../lib/session';
import { useBackDismiss } from '../lib/backnav';
import { fieldsFor } from '../lib/fields';
import { PLAYER_ROLES, STAFF_ROLES, type TKey } from '../lib/i18n';

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
  useBackDismiss(true, onClose);
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
    setSaving(true); setError('');
    const data: Record<string, unknown> = {};
    for (const f of fields) {
      const v = form[f.key]?.trim();
      data[f.key] = v ? v : null; // empty => Unknown
    }
    try {
      await onSave(data as Partial<Person>);
    } catch (err: any) {
      setError(err.message || 'Error'); setSaving(false);
    }
  };

  const heading = readOnly
    ? `${kind === 'players' ? t('players') : t('staff')}`
    : `${initial ? t('edit') : t('add')} ${kind === 'players' ? t('players') : t('staff')}`;

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="sheet-grip" />
        <h2 className="title" style={{ marginBottom: '1rem' }}>{heading}</h2>

        <div className="grid-fields">
          {fields.map((f) => (
            <div className="field" key={f.key}>
              <label>{t(f.key as TKey)}</label>
              {f.type === 'role' ? (
                <select className="select" value={form[f.key]} disabled={readOnly}
                  onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">{t('unknown')}</option>
                  {roleOptions.map((r) => <option key={r} value={r}>{t(r as TKey)}</option>)}
                </select>
              ) : (
                <input className="input"
                  type={f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'}
                  value={form[f.key]} disabled={readOnly} placeholder={t('unknown')}
                  onChange={(e) => set(f.key, e.target.value)} />
              )}
            </div>
          ))}
        </div>

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          {!readOnly && (
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t('loading') : t('save')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
