import { useState } from 'react';
import { api, type Match, type OpponentLineupInput } from '../lib/api';
import { useSession } from '../lib/session';
import { IconCheck, IconAlert, IconTrash, IconPlus } from './Icons';

// One editable opponent row. birthDate/matricola are carried through from a parsed
// distinta (not shown) so they're kept when saving.
export interface OppRowInit {
  shirtNumber: number | null;
  name: string;
  birthDate: string | null;
  matricola: string | null;
  starter: boolean;
  captain: boolean;
  viceCaptain: boolean;
}

interface Row extends OppRowInit { key: string; shirt: string; }

let seq = 0;
const emptyRow = (starter = true): OppRowInit =>
  ({ shirtNumber: null, name: '', birthDate: null, matricola: null, starter, captain: false, viceCaptain: false });
const toRow = (r: OppRowInit): Row =>
  ({ ...r, key: `r${seq++}`, shirt: r.shirtNumber != null ? String(r.shirtNumber) : '' });

// Lightweight editor for the opposing team's line-up (free-text rows). Seeded from
// a parsed distinta or an existing saved line-up; not tied to our own roster.
export default function OpponentLineupEditor({
  teamId, seasonId, matchId, init, warnings, onDone, onCancel,
}: {
  teamId: string; seasonId: string; matchId: string;
  init: OppRowInit[];
  warnings?: string[];
  onDone: (m: Match) => void;
  onCancel: () => void;
}) {
  const { t } = useSession();
  const [rows, setRows] = useState<Row[]>(init.length ? init.map(toRow) : [toRow(emptyRow())]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const patch = (key: string, p: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const remove = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));
  const add = () => setRows((prev) => [...prev, toRow(emptyRow(prev.filter((r) => r.starter).length < 11))]);

  // Captain / vice are single-choice across the whole line-up.
  const pickCaptain = (key: string) =>
    setRows((prev) => prev.map((r) => ({
      ...r, captain: r.key === key ? !r.captain : false, viceCaptain: r.key === key ? false : r.viceCaptain,
    })));
  const pickVice = (key: string) =>
    setRows((prev) => prev.map((r) => ({
      ...r, viceCaptain: r.key === key ? !r.viceCaptain : false, captain: r.key === key ? false : r.captain,
    })));

  const save = async () => {
    setSaving(true); setError('');
    const lineup: OpponentLineupInput[] = rows
      .filter((r) => r.name.trim())
      .map((r, i) => ({
        order: i + 1,
        shirtNumber: r.shirt.trim() === '' ? null : parseInt(r.shirt, 10),
        name: r.name.trim(),
        birthDate: r.birthDate,
        matricola: r.matricola,
        captain: r.captain,
        viceCaptain: r.viceCaptain,
        starter: r.starter,
      }));
    try {
      const updated = await api.saveOpponentLineup(teamId, seasonId, matchId, lineup);
      onDone(updated);
    } catch (err: any) {
      setError(err.message || 'Error'); setSaving(false);
    }
  };

  const starterCount = rows.filter((r) => r.starter).length;

  return (
    <div>
      {warnings && warnings.length > 0 && (
        <div className="card warn-card" style={{ marginBottom: '1rem' }}>
          {warnings.map((w, i) => (
            <p key={i} className="muted inline-ico" style={{ fontSize: '0.8rem', margin: '0.2rem 0' }}>
              <IconAlert size={14} /> {w}
            </p>
          ))}
        </div>
      )}

      <div className="row" style={{ marginBottom: '0.4rem' }}>
        <h3 className="settings-heading row-main" style={{ margin: 0 }}>{t('opponentPlayers')}</h3>
        <span className={`subcount${starterCount > 11 ? ' full' : ''}`}>{starterCount} / 11</span>
      </div>

      <div className="stack">
        {rows.map((r) => (
          <div key={r.key} className="lineup-edit-row on">
            <input className="input shirt-input" inputMode="numeric" placeholder={t('shirtShort')}
              value={r.shirt} onChange={(e) => patch(r.key, { shirt: e.target.value.replace(/[^0-9]/g, '') })} />
            <input className="input" style={{ flex: 1, minWidth: 0 }} placeholder={t('opponentName')}
              value={r.name} onChange={(e) => patch(r.key, { name: e.target.value })} />
            <div className="lineup-edit-controls">
              <div className="segmented mini">
                <button type="button" className={r.starter ? 'active' : ''} onClick={() => patch(r.key, { starter: true })}>{t('starters')}</button>
                <button type="button" className={!r.starter ? 'active' : ''} onClick={() => patch(r.key, { starter: false })}>{t('bench')}</button>
              </div>
              <button type="button" className={`pill-btn${r.captain ? ' pill-c' : ''}`}
                title={t('captain')} onClick={() => pickCaptain(r.key)}>{t('captainShort')}</button>
              <button type="button" className={`pill-btn${r.viceCaptain ? ' pill-v' : ''}`}
                title={t('viceCaptain')} onClick={() => pickVice(r.key)}>{t('viceCaptainShort')}</button>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" title={t('delete')} onClick={() => remove(r.key)}>
                <IconTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.7rem' }} onClick={add}>
        <IconPlus /> {t('addOpponentPlayer')}
      </button>

      {error && <p className="error" style={{ marginTop: '0.8rem' }}>{error}</p>}

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
          {saving ? t('loading') : <><IconCheck /> {t('saveOpponentLineup')}</>}
        </button>
      </div>
    </div>
  );
}
