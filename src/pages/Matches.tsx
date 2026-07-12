import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Match, type SeasonSettings } from '../lib/api';
import { useSession } from '../lib/session';
import { useNav } from '../lib/nav';
import { IconPlus, IconTrash } from '../components/Icons';

const todayInput = () => new Date().toISOString().slice(0, 10);

export default function Matches() {
  const s = useSession();
  const { t, teamId, seasonId, editable, me } = s;
  const nav = useNav();

  const [matches, setMatches] = useState<Match[]>([]);
  const [settings, setSettings] = useState<SeasonSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Match | 'new' | null>(null);

  const teamName = useMemo(
    () => me?.teams.find((tm) => tm.id === teamId)?.name ?? t('team'),
    [me, teamId, t],
  );

  const load = useCallback(async () => {
    if (!teamId || !seasonId) return;
    setLoading(true);
    try {
      const [m, st] = await Promise.all([
        api.matches(teamId, seasonId),
        api.settings(teamId, seasonId),
      ]);
      setMatches(m);
      setSettings(st);
    } finally {
      setLoading(false);
    }
  }, [teamId, seasonId]);

  useEffect(() => { load(); }, [load]);

  const saveMatch = async (data: { opponent: string; date: string; matchType: string }) => {
    if (!teamId || !seasonId) return;
    if (editing === 'new') {
      const created = await api.createMatch(teamId, seasonId, data);
      setMatches((prev) => [created, ...prev]);
      // Jump straight into the new match to set up the formation.
      nav.open({ type: 'match', id: created.id });
    } else if (editing) {
      const updated = await api.updateMatch(teamId, seasonId, editing.id, data);
      setMatches((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    }
    setEditing(null);
  };

  const removeMatch = async (m: Match) => {
    if (!teamId || !seasonId || !confirm(t('confirmDelete'))) return;
    await api.deleteMatch(teamId, seasonId, m.id);
    setMatches((prev) => prev.filter((x) => x.id !== m.id));
  };

  if (!teamId) return <p className="empty">{t('noTeam')}</p>;

  return (
    <div>
      <div className="section-head">
        <h2 className="title">{t('matches')}</h2>
        {editable && (
          <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
            <IconPlus /> {t('add')}
          </button>
        )}
      </div>

      {loading ? (
        <p className="empty">{t('loading')}</p>
      ) : matches.length === 0 ? (
        <p className="empty">{t('noMatches')}</p>
      ) : (
        <div className="timeline">
          {matches.map((m) => {
            const d = new Date(m.date);
            const goals = m.events.filter((e) => e.type === 'GOAL').length;
            return (
              <div key={m.id} className="card interactive match-card" onClick={() => nav.open({ type: 'match', id: m.id })}>
                <div className="match-date">
                  <div className="d">{isNaN(d.getTime()) ? '–' : d.getDate()}</div>
                  <div className="m">{isNaN(d.getTime()) ? '' : d.toLocaleDateString(s.lang, { month: 'short' })}</div>
                </div>
                <div className="row-main">
                  <div className="row-title">{teamName} vs {m.opponent}</div>
                  <div className="match-meta">
                    <span className="tag tag-static">{m.matchType}</span>
                    {goals > 0 && <span className="row-sub">⚽ {goals}</span>}
                  </div>
                </div>
                {editable && (
                  <button className="btn btn-ghost btn-sm btn-icon" title={t('delete')}
                    onClick={(e) => { e.stopPropagation(); removeMatch(m); }}>
                    <IconTrash />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing !== null && settings && (
        <MatchForm
          initial={editing === 'new' ? null : editing}
          matchTypes={settings.matchTypes}
          onSave={saveMatch}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ── Add / edit match form (opponent, date, type) ─────────────────────────────
export function MatchForm({
  initial, matchTypes, onSave, onClose,
}: {
  initial: Match | null;
  matchTypes: string[];
  onSave: (data: { opponent: string; date: string; matchType: string }) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useSession();
  const [opponent, setOpponent] = useState(initial?.opponent ?? '');
  const [date, setDate] = useState(initial ? initial.date.slice(0, 10) : todayInput());
  const [matchType, setMatchType] = useState(initial?.matchType ?? matchTypes[0] ?? '');
  // Keep an existing match's type selectable even if it was later removed from
  // the season's list, so editing other fields never silently rewrites it.
  const typeOptions = useMemo(
    () => (initial && initial.matchType && !matchTypes.includes(initial.matchType)
      ? [initial.matchType, ...matchTypes]
      : matchTypes),
    [initial, matchTypes],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSave = opponent.trim() && date && matchType;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true); setError('');
    try {
      await onSave({ opponent: opponent.trim(), date, matchType });
    } catch (err: any) {
      setError(err.message || 'Error'); setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="sheet-grip" />
        <h2 className="title" style={{ marginBottom: '1rem' }}>{initial ? t('editMatch') : t('newMatch')}</h2>

        <div className="grid-fields">
          <div className="field">
            <label>{t('matchName')}</label>
            <input className="input" value={opponent} autoFocus
              placeholder={t('opponent')} onChange={(e) => setOpponent(e.target.value)} />
            <span className="muted" style={{ fontSize: '0.72rem' }}>{t('matchNameHint')}</span>
          </div>
          <div className="field">
            <label>{t('matchDate')}</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>{t('matchTypeLabel')}</label>
            <select className="select" value={matchType} onChange={(e) => setMatchType(e.target.value)}>
              {typeOptions.length === 0 && <option value="">—</option>}
              {typeOptions.map((mt) => <option key={mt} value={mt}>{mt}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={!canSave || saving}>
            {saving ? t('loading') : t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
