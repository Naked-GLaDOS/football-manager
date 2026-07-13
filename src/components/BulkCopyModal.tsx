import { useState } from 'react';
import type { Kind, Person } from '../lib/api';
import { useSession } from '../lib/session';
import { useBackDismiss } from '../lib/backnav';
import { fieldsFor, fieldValue } from '../lib/fields';
import type { TKey } from '../lib/i18n';
import { copyText, shareText } from '../lib/clipboard';
import { IconCopy, IconCheck, IconShare } from './Icons';

const DEFAULT_FIELDS = ['firstName', 'lastName'];

export default function BulkCopyModal({ kind, people, title, onClose }: {
  kind: Kind;
  people: Person[];
  title: string;
  onClose: () => void;
}) {
  const { t } = useSession();
  useBackDismiss(true, onClose);
  const fields = fieldsFor(kind);

  // Default: every player selected, Name + Surname fields.
  const [players, setPlayers] = useState<Set<string>>(() => new Set(people.map((p) => p.id)));
  const [keys, setKeys] = useState<Set<string>>(() => new Set(DEFAULT_FIELDS));
  const [copied, setCopied] = useState(false);

  const personName = (p: Person) => [p.lastName, p.firstName].filter(Boolean).join(' ') || t('unknown');

  const toggle = (set: Set<string>, upd: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    upd(next);
    setCopied(false);
  };

  const chosenFields = fields.filter((f) => keys.has(f.key));
  const canCopy = players.size > 0 && chosenFields.length > 0;
  const selected = () => people.filter((p) => players.has(p.id));

  // Tab-separated with a header row: pastes cleanly into a spreadsheet.
  const asTable = () => {
    const header = chosenFields.map((f) => t(f.key as TKey)).join('\t');
    const lines = selected().map((p) => chosenFields.map((f) => fieldValue(p, f, t) ?? '').join('\t'));
    return [header, ...lines].join('\n');
  };

  // Readable, one player per line (fields joined by " · "): nicer in a chat.
  const asMessage = () => {
    const body = selected()
      .map((p) => chosenFields.map((f) => fieldValue(p, f, t)).filter(Boolean).join(' · '))
      .join('\n');
    return `${title}\n${body}`;
  };

  const copy = async () => {
    if (!canCopy) return;
    await copyText(asTable());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const share = async () => {
    if (!canCopy) return;
    await shareText(title, asMessage());
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <h2 className="title" style={{ marginBottom: '1rem' }}>{t('copyData')}</h2>

        {/* Players */}
        <div className="row" style={{ marginBottom: '0.4rem' }}>
          <h3 className="settings-heading row-main" style={{ margin: 0 }}>
            {t('selectPlayersLabel')} ({players.size}/{people.length})
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={() => { setPlayers(new Set(people.map((p) => p.id))); setCopied(false); }}>{t('selectAll')}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setPlayers(new Set()); setCopied(false); }}>{t('deselectAll')}</button>
        </div>
        <div className="check-list" style={{ maxHeight: 200 }}>
          {people.map((p) => (
            <label key={p.id} className="check-row">
              <input type="checkbox" checked={players.has(p.id)} onChange={() => toggle(players, setPlayers, p.id)} />
              <span>{personName(p)}</span>
            </label>
          ))}
        </div>

        {/* Fields */}
        <h3 className="settings-heading" style={{ marginTop: '1rem' }}>{t('selectFieldsLabel')}</h3>
        <div className="check-grid">
          {fields.map((f) => (
            <label key={f.key} className="check-row">
              <input type="checkbox" checked={keys.has(f.key)} onChange={() => toggle(keys, setKeys, f.key)} />
              <span>{t(f.key as TKey)}</span>
            </label>
          ))}
        </div>

        {!canCopy && <p className="muted" style={{ fontSize: '0.78rem', marginTop: '0.6rem' }}>{t('nothingSelected')}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('close')}</button>
          <button type="button" className="btn btn-ghost" disabled={!canCopy} onClick={share}>
            <IconShare /> {t('share')}
          </button>
          <button type="button" className="btn btn-primary" disabled={!canCopy} onClick={copy}>
            {copied ? <><IconCheck /> {t('copied')}</> : <><IconCopy /> {t('copySelected')}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
