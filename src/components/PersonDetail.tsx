import { useState } from 'react';
import type { Kind, Person } from '../lib/api';
import { useSession } from '../lib/session';
import { fieldsFor, fieldValue } from '../lib/fields';
import type { TKey } from '../lib/i18n';
import { copyText } from '../lib/clipboard';
import PersonFields from './PersonFields';
import { IconCopy, IconCheck, IconEdit } from './Icons';

export default function PersonDetail({ kind, person, canEdit, onEdit, onClose }: {
  kind: Kind;
  person: Person;
  canEdit: boolean;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { t } = useSession();
  const [copied, setCopied] = useState(false);

  const name = [person.lastName, person.firstName].filter(Boolean).join(' ') || t('unknown');

  const copyAll = async () => {
    const lines = fieldsFor(kind)
      .map((f) => { const v = fieldValue(person, f, t); return v ? `${t(f.key as TKey)}: ${v}` : null; })
      .filter(Boolean);
    await copyText([name, ...lines].join('\n'));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
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

        <PersonFields kind={kind} person={person} />

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={copyAll}>
            {copied ? <IconCheck /> : <IconCopy />} {copied ? t('copied') : t('copyAll')}
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>{t('close')}</button>
        </div>
      </div>
    </div>
  );
}
