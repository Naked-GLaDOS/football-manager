import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { ABSENCE_REASONS, type TKey } from '../lib/i18n';
import { IconPlus, IconClose, IconCheck } from '../components/Icons';

const clampInt = (v: string, min: number, max: number, fallback: number) => {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

export default function Impostazioni() {
  const { t, teamId, seasonId, editable } = useSession();

  const [loading, setLoading] = useState(true);
  const [srvEditable, setSrvEditable] = useState(true);
  const [periods, setPeriods] = useState('2');
  const [periodMinutes, setPeriodMinutes] = useState('45');
  const [maxSubs, setMaxSubs] = useState('5');
  const [matchTypes, setMatchTypes] = useState<string[]>([]);
  const [newType, setNewType] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!teamId || !seasonId) return;
    setLoading(true);
    try {
      const s = await api.settings(teamId, seasonId);
      setPeriods(String(s.periods));
      setPeriodMinutes(String(s.periodMinutes));
      setMaxSubs(String(s.maxSubstitutions));
      setMatchTypes(s.matchTypes);
      setSrvEditable(s.editable);
    } finally {
      setLoading(false);
    }
  }, [teamId, seasonId]);

  useEffect(() => { load(); }, [load]);

  const canEdit = editable && srvEditable;

  const addType = () => {
    const v = newType.trim();
    if (!v) return;
    if (!matchTypes.some((m) => m.toLowerCase() === v.toLowerCase())) {
      setMatchTypes((prev) => [...prev, v]);
    }
    setNewType('');
  };
  const removeType = (i: number) => setMatchTypes((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!teamId || !seasonId) return;
    setSaving(true); setError('');
    const p = clampInt(periods, 1, 20, 2);
    const pm = clampInt(periodMinutes, 1, 240, 45);
    const ms = clampInt(maxSubs, 0, 30, 5);
    try {
      const res = await api.updateSettings(teamId, seasonId, {
        periods: p, periodMinutes: pm, matchTypes, maxSubstitutions: ms,
      });
      setPeriods(String(res.periods));
      setPeriodMinutes(String(res.periodMinutes));
      setMaxSubs(String(res.maxSubstitutions));
      setMatchTypes(res.matchTypes);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (!teamId) return <p className="empty">{t('noTeam')}</p>;
  if (loading) return <p className="empty">{t('loading')}</p>;

  return (
    <div>
      <div className="section-head"><h2 className="title">{t('settings')}</h2></div>

      {/* Match configuration */}
      <div className="card" style={{ marginBottom: '0.9rem' }}>
        <h3 className="settings-heading">{t('matchSettings')}</h3>
        <div className="grid-fields">
          <div className="field">
            <label>{t('periods')}</label>
            <input className="input" type="number" min={1} max={20} inputMode="numeric"
              value={periods} disabled={!canEdit}
              onChange={(e) => setPeriods(e.target.value)}
              onBlur={() => setPeriods((v) => String(clampInt(v, 1, 20, 2)))} />
          </div>
          <div className="field">
            <label>{t('periodMinutes')}</label>
            <input className="input" type="number" min={1} max={240} inputMode="numeric"
              value={periodMinutes} disabled={!canEdit}
              onChange={(e) => setPeriodMinutes(e.target.value)}
              onBlur={() => setPeriodMinutes((v) => String(clampInt(v, 1, 240, 45)))} />
          </div>
          <div className="field">
            <label>{t('maxSubstitutions')}</label>
            <input className="input" type="number" min={0} max={30} inputMode="numeric"
              value={maxSubs} disabled={!canEdit}
              onChange={(e) => setMaxSubs(e.target.value)}
              onBlur={() => setMaxSubs((v) => String(clampInt(v, 0, 30, 5)))} />
          </div>
        </div>
      </div>

      {/* Match types (editable list) */}
      <div className="card" style={{ marginBottom: '0.9rem' }}>
        <h3 className="settings-heading">{t('matchTypes')}</h3>
        <div className="chip-list">
          {matchTypes.length === 0 && <span className="muted">{t('empty')}</span>}
          {matchTypes.map((m, i) => (
            <span key={`${m}-${i}`} className="tag">
              {m}
              {canEdit && (
                <button type="button" className="tag-x" title={t('delete')} onClick={() => removeType(i)}>
                  <IconClose size={13} />
                </button>
              )}
            </span>
          ))}
        </div>
        {canEdit && (
          <div className="row" style={{ marginTop: '0.8rem', gap: '0.5rem' }}>
            <input className="input" value={newType} placeholder={t('newMatchType')}
              onChange={(e) => setNewType(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addType(); } }} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={addType} disabled={!newType.trim()}>
              <IconPlus /> {t('addType')}
            </button>
          </div>
        )}
      </div>

      {/* Absence reasons (fixed reference list, used for minutes tracking) */}
      <div className="card" style={{ marginBottom: '0.9rem' }}>
        <h3 className="settings-heading">{t('absenceReasons')}</h3>
        <p className="muted" style={{ fontSize: '0.82rem', margin: '0 0 0.7rem' }}>{t('absenceReasonsHint')}</p>
        <div className="chip-list">
          {ABSENCE_REASONS.map((r) => (
            <span key={r} className="tag tag-static">{t(r as TKey)}</span>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {canEdit && (
        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: '0.3rem' }}>
          {saved ? <><IconCheck /> {t('saved')}</> : saving ? t('loading') : t('saveSettings')}
        </button>
      )}
    </div>
  );
}
