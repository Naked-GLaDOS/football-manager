import { useMemo, useState } from 'react';
import { api, type Match, type ParsedDistinta, type Person } from '../lib/api';
import { useSession } from '../lib/session';
import type { TKey } from '../lib/i18n';
import { personName } from './MatchEventsPanel';
import { IconCheck } from './Icons';

// Staff / metadata text fields, in edit order. Keys match Match columns.
export const META_FIELDS: { key: string; label: TKey }[] = [
  { key: 'distintaNumber', label: 'distintaNumber' },
  { key: 'competition', label: 'competition' },
];
export const STAFF_FIELDS: { key: string; label: TKey }[] = [
  { key: 'coachName', label: 'mCoach' },
  { key: 'assistantCoachName', label: 'mAssistantCoach' },
  { key: 'directorName', label: 'mDirector' },
  { key: 'matchOfficialsDirectorName', label: 'mOfficialsDirector' },
  { key: 'doctorName', label: 'mDoctor' },
  { key: 'masseurName', label: 'mMasseur' },
  { key: 'athleticTrainerName', label: 'mAthleticTrainer' },
  { key: 'goalkeeperTrainerName', label: 'mGoalkeeperTrainer' },
  { key: 'assistantRefereeName', label: 'mAssistantReferee' },
];
const ALL_STAFF_KEYS = [...META_FIELDS, ...STAFF_FIELDS].map((f) => f.key);

interface EntryState { starter: boolean; shirt: string; }
export interface EditorInit {
  entries: Record<string, EntryState>;
  captainId: string | null;
  viceId: string | null;
  staff: Record<string, string>;
}

// Seed the editor from a match's saved line-up.
export function initFromMatch(match: Match): EditorInit {
  const entries: Record<string, EntryState> = {};
  let captainId: string | null = null;
  let viceId: string | null = null;
  for (const l of match.lineup) {
    if (!l.player) continue;
    entries[l.player.id] = { starter: l.starter, shirt: l.shirtNumber?.toString() ?? '' };
    if (l.captain) captainId = l.player.id;
    if (l.viceCaptain) viceId = l.player.id;
  }
  const staff: Record<string, string> = {};
  for (const k of ALL_STAFF_KEYS) staff[k] = (match as any)[k] ?? '';
  return { entries, captainId, viceId, staff };
}

// Seed the editor from a parsed distinta (only roster-matched rows are pre-selected).
export function initFromDistinta(parsed: ParsedDistinta): {
  init: EditorInit; warnings: string[]; unmatched: string[];
} {
  const entries: Record<string, EntryState> = {};
  let captainId: string | null = null;
  let viceId: string | null = null;
  for (const p of parsed.players) {
    if (!p.matchedPlayerId) continue;
    entries[p.matchedPlayerId] = { starter: p.starter, shirt: p.shirtNumber?.toString() ?? '' };
    if (p.captain) captainId = p.matchedPlayerId;
    if (p.viceCaptain) viceId = p.matchedPlayerId;
  }
  const staff: Record<string, string> = {};
  for (const k of ALL_STAFF_KEYS) staff[k] = (parsed as any)[k] ?? (parsed.staff as any)[k] ?? '';
  const unmatched = parsed.players
    .filter((p) => p.rawName && !p.matchedPlayerId)
    .map((p) => `${p.rawName}${p.shirtNumber != null ? ` (${p.shirtNumber})` : ''}`);
  return { init: { entries, captainId, viceId, staff }, warnings: parsed.warnings, unmatched };
}

export default function FormationEditor({
  match, players, teamId, seasonId, init, banner, onDone, onCancel,
}: {
  match: Match;
  players: Person[];
  teamId: string;
  seasonId: string;
  init: EditorInit;
  banner?: { warnings: string[]; unmatched: string[] } | null;
  onDone: (m: Match) => void;
  onCancel: () => void;
}) {
  const { t } = useSession();
  const [entries, setEntries] = useState<Record<string, EntryState>>(init.entries);
  const [captainId, setCaptainId] = useState<string | null>(init.captainId);
  const [viceId, setViceId] = useState<string | null>(init.viceId);
  const [staff, setStaff] = useState<Record<string, string>>(init.staff);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const starterCount = useMemo(
    () => Object.values(entries).filter((e) => e.starter).length,
    [entries],
  );

  const toggleInclude = (id: string) => {
    setEntries((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        // Default new players to the bench once the XI is full.
        const startersNow = Object.values(next).filter((e) => e.starter).length;
        next[id] = { starter: startersNow < 11, shirt: '' };
      }
      return next;
    });
    if (captainId === id) setCaptainId(null);
    if (viceId === id) setViceId(null);
  };

  const setEntry = (id: string, patch: Partial<EntryState>) =>
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const pickCaptain = (id: string) => {
    setCaptainId((c) => (c === id ? null : id));
    setViceId((v) => (v === id ? null : v));
  };
  const pickVice = (id: string) => {
    setViceId((v) => (v === id ? null : id));
    setCaptainId((c) => (c === id ? null : c));
  };

  const save = async () => {
    setSaving(true); setError('');
    const lineup = Object.entries(entries).map(([playerId, e]) => ({
      playerId,
      shirtNumber: e.shirt.trim() === '' ? null : parseInt(e.shirt, 10),
      starter: e.starter,
      captain: playerId === captainId,
      viceCaptain: playerId === viceId,
    }));
    const staffPayload: Record<string, string> = {};
    for (const k of ALL_STAFF_KEYS) staffPayload[k] = staff[k]?.trim() ?? '';
    try {
      const updated = await api.saveFormation(teamId, seasonId, match.id, { lineup, staff: staffPayload as any });
      onDone(updated);
    } catch (err: any) {
      setError(err.message || 'Error'); setSaving(false);
    }
  };

  return (
    <div>
      {banner && (banner.warnings.length > 0 || banner.unmatched.length > 0) && (
        <div className="card warn-card" style={{ marginBottom: '1rem' }}>
          {banner.unmatched.length > 0 && (
            <>
              <div className="settings-heading" style={{ marginTop: 0 }}>{t('notMatched')}</div>
              <p className="muted" style={{ fontSize: '0.82rem', margin: '0 0 0.4rem' }}>
                {banner.unmatched.join(' · ')}
              </p>
            </>
          )}
          {banner.warnings.map((w, i) => (
            <p key={i} className="muted" style={{ fontSize: '0.8rem', margin: '0.2rem 0' }}>⚠ {w}</p>
          ))}
        </div>
      )}

      {/* Staff / meta */}
      <h3 className="settings-heading">{t('staffResponsibles')}</h3>
      <div className="grid-fields" style={{ marginBottom: '1rem' }}>
        {[...META_FIELDS, ...STAFF_FIELDS].map((f) => (
          <div className="field" key={f.key}>
            <label>{t(f.label)}</label>
            <input className="input" value={staff[f.key] ?? ''}
              onChange={(e) => setStaff((prev) => ({ ...prev, [f.key]: e.target.value }))} />
          </div>
        ))}
      </div>

      {/* Players */}
      <div className="row" style={{ marginBottom: '0.4rem' }}>
        <h3 className="settings-heading row-main" style={{ margin: 0 }}>{t('formation')}</h3>
        <span className={`subcount${starterCount > 11 ? ' full' : ''}`}>{starterCount} / 11</span>
      </div>
      <p className="muted" style={{ fontSize: '0.78rem', margin: '0 0 0.6rem' }}>{t('selectStarters')}</p>

      <div className="stack">
        {players.map((p) => {
          const e = entries[p.id];
          const included = !!e;
          return (
            <div key={p.id} className={`lineup-edit-row${included ? ' on' : ''}`}>
              <label className="check-row" style={{ flex: 1, minWidth: 0 }}>
                <input type="checkbox" checked={included} onChange={() => toggleInclude(p.id)} />
                <span className="ellipsis">{personName(p, t('unknown'))}</span>
              </label>
              {included && (
                <div className="lineup-edit-controls">
                  <input className="input shirt-input" inputMode="numeric" placeholder={t('shirtShort')}
                    value={e.shirt} onChange={(ev) => setEntry(p.id, { shirt: ev.target.value.replace(/[^0-9]/g, '') })} />
                  <div className="segmented mini">
                    <button type="button" className={e.starter ? 'active' : ''} onClick={() => setEntry(p.id, { starter: true })}>{t('starters')}</button>
                    <button type="button" className={!e.starter ? 'active' : ''} onClick={() => setEntry(p.id, { starter: false })}>{t('bench')}</button>
                  </div>
                  <button type="button" className={`pill-btn${captainId === p.id ? ' pill-c' : ''}`}
                    title={t('captain')} onClick={() => pickCaptain(p.id)}>{t('captainShort')}</button>
                  <button type="button" className={`pill-btn${viceId === p.id ? ' pill-v' : ''}`}
                    title={t('viceCaptain')} onClick={() => pickVice(p.id)}>{t('viceCaptainShort')}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="error" style={{ marginTop: '0.8rem' }}>{error}</p>}

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
          {saving ? t('loading') : <><IconCheck /> {t('saveFormation')}</>}
        </button>
      </div>
    </div>
  );
}
