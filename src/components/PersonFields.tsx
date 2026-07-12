import { useState } from 'react';
import type { Kind, Person } from '../lib/api';
import { useSession } from '../lib/session';
import { fieldsFor, fieldValue } from '../lib/fields';
import type { TKey } from '../lib/i18n';
import { copyText } from '../lib/clipboard';
import { IconCopy, IconCheck } from './Icons';

// The read-only labelled list of a person's fields with a per-field copy button.
// Shared by the detail modal (staff) and the single-player page.
export default function PersonFields({ kind, person }: { kind: Kind; person: Person }) {
  const { t } = useSession();
  const fields = fieldsFor(kind);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, val: string) => {
    await copyText(val);
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1400);
  };

  return (
    <div className="detail-list">
      {fields.map((f) => {
        const val = fieldValue(person, f, t);
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
  );
}
