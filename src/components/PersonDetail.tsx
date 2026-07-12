import { useState } from 'react';
import type { Kind, Person } from '../lib/api';
import { useSession } from '../lib/session';
import { fieldsFor } from '../lib/fields';
import type { TKey } from '../lib/i18n';
import { IconCopy, IconCheck, IconEdit } from './Icons';

const fmtDate = (v: string) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString();
};

// Copy helper with a fallback for non-secure contexts / older PWA webviews
// where the async Clipboard API is unavailable.
async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch { /* fall through */ }
  const ta = document.createElement('textarea');
  ta.value = value;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); } catch { /* ignore */ }
  document.body.removeChild(ta);
}

export default function PersonDetail({ kind, person, canEdit, onEdit, onClose }: {
  kind: Kind;
  person: Person;
  canEdit: boolean;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { t } = useSession();
  const fields = fieldsFor(kind);
  const [copied, setCopied] = useState<string | null>(null);

  const name = [person.lastName, person.firstName].filter(Boolean).join(' ') || t('unknown');

  // Displayed (and copied) value for a field: translated role, formatted date, else raw.
  const value = (f: { key: string; type: string }): string | null => {
    const raw = (person as any)[f.key] as string | null | undefined;
    if (!raw) return null;
    if (f.type === 'role') return t(raw as TKey);
    if (f.type === 'date') return fmtDate(raw);
    return raw;
  };

  const copy = async (key: string, val: string) => {
    await copyText(val);
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1400);
  };

  const copyAll = async () => {
    const lines = fields
      .map((f) => { const v = value(f); return v ? `${t(f.key as TKey)}: ${v}` : null; })
      .filter(Boolean);
    await copy('__all__', [name, ...lines].join('\n'));
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="row" style={{ marginBottom: '1rem' }}>
          <h2 className="title row-main" style={{ margin: 0 }}>{name}</h2>
          {canEdit && (
            <button className="btn btn-ghost btn-sm btn-icon" onClick={onEdit} title={t('edit')}>
              <IconEdit />
            </button>
          )}
        </div>

        <div className="detail-list">
          {fields.map((f) => {
            const val = value(f);
            return (
              <div className="detail-row" key={f.key}>
                <div className="detail-main">
                  <div className="detail-label">{t(f.key as TKey)}</div>
                  <div className={`detail-value${val ? '' : ' muted'}`}>{val ?? t('unknown')}</div>
                </div>
                {val && (
                  <button className="btn btn-ghost btn-sm btn-icon" title={t('copy')}
                    onClick={() => copy(f.key, val)}>
                    {copied === f.key ? <IconCheck /> : <IconCopy />}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={copyAll}>
            {copied === '__all__' ? <IconCheck /> : <IconCopy />} {copied === '__all__' ? t('copied') : t('copyAll')}
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>{t('close')}</button>
        </div>
      </div>
    </div>
  );
}
