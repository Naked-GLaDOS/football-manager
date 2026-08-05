import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api, ATTENDANCE_STATUSES, PRESENT_STATUSES,
  type AttendanceStatus, type Person, type Training,
} from '../lib/api';
import { useSession } from '../lib/session';
import { useBackDismiss } from '../lib/backnav';
import type { TKey } from '../lib/i18n';
import { IconPlus, IconTrash } from '../components/Icons';

const todayInput = () => new Date().toISOString().slice(0, 10);

// Today's UTC midnight in ms — training dates are stored at UTC midnight, so a
// session is "future" when its date is strictly after this.
const todayUtcMs = () => {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
};
const isFuture = (tr: Training) => new Date(tr.date).getTime() > todayUtcMs();

// Person's display name (surname first), or "unknown".
const nameOf = (p: Person, fallback: string) =>
  [p.lastName, p.firstName].filter(Boolean).join(' ') || fallback;

// How many recorded attendances count as physically present.
const presentCount = (tr: Training) =>
  tr.attendances.filter((a) => PRESENT_STATUSES.includes(a.status)).length;

type Tab = 'sessions' | 'statistics';

export default function Trainings() {
  const s = useSession();
  const { t, teamId, seasonId, editable } = s;

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [roster, setRoster] = useState<Person[]>([]);
  const [rosterSize, setRosterSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('sessions');

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Training | null>(null);

  const load = useCallback(async () => {
    if (!teamId || !seasonId) return;
    setLoading(true);
    try {
      const [tr, r] = await Promise.all([
        api.trainings(teamId, seasonId),
        api.roster('players', teamId, seasonId),
      ]);
      setTrainings(tr.trainings);
      setRosterSize(tr.rosterSize);
      setRoster(r);
    } finally {
      setLoading(false);
    }
  }, [teamId, seasonId]);

  useEffect(() => { load(); }, [load]);

  // Only active (non-skipped) sessions are shown and counted.
  const active = useMemo(() => trainings.filter((tr) => !tr.skipped), [trainings]);
  // Statistics count only sessions that have already happened (not future ones).
  const pastActive = useMemo(() => active.filter((tr) => !isFuture(tr)), [active]);
  const hasFuture = useMemo(() => trainings.some((tr) => !tr.skipped && isFuture(tr)), [trainings]);

  const addTraining = async (date: string) => {
    if (!teamId || !seasonId) return;
    const created = await api.createTraining(teamId, seasonId, date);
    setTrainings((prev) => {
      const rest = prev.filter((x) => x.id !== created.id);
      return [created, ...rest].sort((a, b) => b.date.localeCompare(a.date));
    });
    setAdding(false);
    setEditing(created);
  };

  const removeTraining = async (tr: Training) => {
    if (!teamId || !seasonId || !confirm(t('confirmDelete'))) return;
    await api.deleteTraining(teamId, seasonId, tr.id);
    // Auto sessions are soft-skipped server-side; drop from the visible list either way.
    setTrainings((prev) => prev.filter((x) => x.id !== tr.id));
  };

  const removeFuture = async () => {
    if (!teamId || !seasonId || !confirm(t('confirmDelete'))) return;
    await api.deleteFutureTrainings(teamId, seasonId);
    setTrainings((prev) => prev.filter((tr) => !isFuture(tr)));
  };

  const onSaved = (updated: Training) => {
    setTrainings((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    setEditing(null);
  };

  if (!teamId) return <p className="empty">{t('noTeam')}</p>;

  return (
    <div>
      <div className="section-head">
        <h2 className="title">{t('trainings')}</h2>
        {editable && tab === 'sessions' && (
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
            <IconPlus /> {t('add')}
          </button>
        )}
      </div>

      <div className="segmented tabs" style={{ marginBottom: '1rem' }}>
        <button type="button" className={tab === 'sessions' ? 'active' : ''} onClick={() => setTab('sessions')}>
          {t('sessions')}
        </button>
        <button type="button" className={tab === 'statistics' ? 'active' : ''} onClick={() => setTab('statistics')}>
          {t('statistics')}
        </button>
      </div>

      {loading ? (
        <p className="empty">{t('loading')}</p>
      ) : tab === 'statistics' ? (
        <MonthlyStats trainings={pastActive} roster={roster} />
      ) : active.length === 0 ? (
        <p className="empty">{t('noTrainings')}</p>
      ) : (
        <>
        {editable && hasFuture && (
          <button className="btn btn-ghost btn-sm" onClick={removeFuture}
            style={{ marginBottom: '0.8rem', color: 'var(--danger)' }}>
            <IconTrash /> {t('deleteFutureTrainings')}
          </button>
        )}
        <div className="timeline">
          {active.map((tr) => {
            const d = new Date(tr.date);
            return (
              <div key={tr.id} className="card interactive match-card" onClick={() => setEditing(tr)}>
                <div className="match-date">
                  <div className="d">{isNaN(d.getTime()) ? '–' : d.getUTCDate()}</div>
                  <div className="m">{isNaN(d.getTime()) ? '' : d.toLocaleDateString(s.lang, { month: 'short', timeZone: 'UTC' })}</div>
                </div>
                <div className="row-main">
                  <div className="row-title" style={{ textTransform: 'capitalize' }}>
                    {isNaN(d.getTime()) ? '' : d.toLocaleDateString(s.lang, { weekday: 'long', timeZone: 'UTC' })}
                  </div>
                  <div className="match-meta">
                    <span className="tag tag-static">{t('present')}: {presentCount(tr)}/{rosterSize}</span>
                  </div>
                </div>
                {editable && (
                  <button className="btn btn-ghost btn-sm btn-icon" title={t('skipTraining')}
                    onClick={(e) => { e.stopPropagation(); removeTraining(tr); }}>
                    <IconTrash />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        </>
      )}

      {adding && <AddTrainingModal onSave={addTraining} onClose={() => setAdding(false)} />}
      {editing && (
        <AttendanceModal
          training={editing} roster={roster} rosterSize={rosterSize}
          canEdit={editable} onSaved={onSaved} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

// ── Add training (pick a date) ────────────────────────────────────────────────
function AddTrainingModal({
  onSave, onClose,
}: { onSave: (date: string) => Promise<void>; onClose: () => void }) {
  const { t } = useSession();
  useBackDismiss(true, onClose);
  const [date, setDate] = useState(todayInput());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    setSaving(true); setError('');
    try {
      await onSave(date);
    } catch (err: any) {
      setError(err.message || 'Error'); setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="sheet-grip" />
        <h2 className="title" style={{ marginBottom: '1rem' }}>{t('newTraining')}</h2>
        <div className="field">
          <label>{t('trainingDate')}</label>
          <input className="input" type="date" value={date} autoFocus onChange={(e) => setDate(e.target.value)} />
        </div>
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={!date || saving}>
            {saving ? t('loading') : t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Attendance editor for a single session ────────────────────────────────────
function AttendanceModal({
  training, roster, rosterSize, canEdit, onSaved, onClose,
}: {
  training: Training;
  roster: Person[];
  rosterSize: number;
  canEdit: boolean;
  onSaved: (t: Training) => void;
  onClose: () => void;
}) {
  const s = useSession();
  const { t } = s;
  useBackDismiss(true, onClose);

  // Local attendance map: playerId → status (or '' for not recorded).
  const initial = useMemo(() => {
    const m: Record<string, AttendanceStatus | ''> = {};
    for (const a of training.attendances) m[a.playerId] = a.status;
    return m;
  }, [training]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus | ''>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setStatus = (playerId: string, status: AttendanceStatus | '') =>
    setStatuses((prev) => ({ ...prev, [playerId]: status }));

  // Bulk-set every player to one status (e.g. everyone present / absent).
  const setAll = (status: AttendanceStatus) =>
    setStatuses(Object.fromEntries(roster.map((p) => [p.id, status])));

  const present = roster.filter((p) => PRESENT_STATUSES.includes(statuses[p.id] as AttendanceStatus)).length;

  const d = new Date(training.date);
  const dateLabel = isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(s.lang, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

  const save = async () => {
    if (!s.teamId || !s.seasonId) return;
    setSaving(true); setError('');
    try {
      const attendances = roster.map((p) => ({
        playerId: p.id,
        status: (statuses[p.id] || null) as AttendanceStatus | null,
      }));
      const updated = await api.saveAttendance(s.teamId, s.seasonId, training.id, attendances);
      onSaved(updated);
    } catch (err: any) {
      setError(err.message || 'Error'); setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="sheet-grip" />
        <div className="row" style={{ alignItems: 'baseline', gap: '0.6rem', marginBottom: '0.9rem' }}>
          <h2 className="title" style={{ margin: 0, textTransform: 'capitalize' }}>{dateLabel}</h2>
          <span className="row-main" />
          <span className="tag tag-static">{t('present')}: {present}/{rosterSize}</span>
        </div>

        {canEdit && roster.length > 0 && (
          <div className="row" style={{ gap: '0.5rem', marginBottom: '0.8rem' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAll('PRESENT')}>
              {t('allPresent')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAll('ABSENT')}>
              {t('allAbsent')}
            </button>
          </div>
        )}

        {roster.length === 0 ? (
          <p className="empty">{t('empty')}</p>
        ) : (
          <div className="stack">
            {roster.map((p) => (
              <div key={p.id} className="card row" style={{ padding: '0.5rem 0.75rem', gap: '0.6rem' }}>
                <span className="row-main row-title" style={{ fontSize: '0.9rem' }}>{nameOf(p, t('unknown'))}</span>
                <select className="select compact" value={statuses[p.id] ?? ''} disabled={!canEdit}
                  onChange={(e) => setStatus(p.id, e.target.value as AttendanceStatus | '')}>
                  <option value="">{t('notRecorded')}</option>
                  {ATTENDANCE_STATUSES.map((st) => (
                    <option key={st} value={st}>{t(st as TKey)}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('close')}</button>
          {canEdit && (
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t('loading') : t('save')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ── Monthly attendance statistics ─────────────────────────────────────────────
function MonthlyStats({ trainings, roster }: { trainings: Training[]; roster: Person[] }) {
  const { t, lang } = useSession();
  // Which statuses count toward "attended"; default = physically present.
  const [counted, setCounted] = useState<Set<AttendanceStatus>>(new Set(PRESENT_STATUSES));

  const toggle = (st: AttendanceStatus) =>
    setCounted((prev) => {
      const next = new Set(prev);
      if (next.has(st)) next.delete(st); else next.add(st);
      return next;
    });

  // Group sessions by calendar month (UTC), newest month first.
  const months = useMemo(() => {
    const map = new Map<string, Training[]>();
    for (const tr of trainings) {
      const d = new Date(tr.date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      (map.get(key) ?? map.set(key, []).get(key)!).push(tr);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [trainings]);

  const monthLabel = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(lang, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  };

  if (roster.length === 0) return <p className="empty">{t('empty')}</p>;
  if (months.length === 0) return <p className="empty">{t('noTrainings')}</p>;

  return (
    <div>
      <div className="card" style={{ marginBottom: '0.9rem' }}>
        <h3 className="settings-heading">{t('countedStatuses')}</h3>
        <p className="muted" style={{ fontSize: '0.82rem', margin: '0 0 0.7rem' }}>{t('countedStatusesHint')}</p>
        <div className="chip-list">
          {ATTENDANCE_STATUSES.map((st) => (
            <button key={st} type="button" className={`chip${counted.has(st) ? ' on' : ''}`}
              onClick={() => toggle(st)}>
              {t(st as TKey)}
            </button>
          ))}
        </div>
      </div>

      {months.map(([key, sessions]) => {
        const total = sessions.length;
        // Per player: how many of this month's sessions had a counted status.
        const rows = roster.map((p) => {
          const n = sessions.filter((tr) =>
            tr.attendances.some((a) => a.playerId === p.id && counted.has(a.status)),
          ).length;
          return { p, n };
        });
        return (
          <div key={key} className="card" style={{ marginBottom: '0.9rem' }}>
            <div className="row" style={{ alignItems: 'baseline', marginBottom: '0.6rem' }}>
              <h3 className="settings-heading" style={{ margin: 0, textTransform: 'capitalize' }}>{monthLabel(key)}</h3>
              <span className="row-main" />
              <span className="tag tag-static">{total} {t('sessions').toLowerCase()}</span>
            </div>
            <div className="stack">
              {rows.map(({ p, n }) => {
                const pct = total ? Math.round((n / total) * 100) : 0;
                return (
                  <div key={p.id} className="card row" style={{ padding: '0.45rem 0.75rem', gap: '0.6rem' }}>
                    <span className="row-main row-title" style={{ fontSize: '0.88rem' }}>{nameOf(p, t('unknown'))}</span>
                    <span className="row-sub">{n}/{total}</span>
                    <strong style={{ minWidth: 44, textAlign: 'right' }}>{pct}%</strong>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
