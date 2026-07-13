import { useCallback, useEffect, useState } from 'react';
import { api, MATCH_DURATION_DEFAULT, type MatchTypeConfig } from '../lib/api';
import { useSession } from '../lib/session';
import { ABSENCE_REASONS, type TKey } from '../lib/i18n';
import { IconPlus, IconClose, IconCheck } from '../components/Icons';

const clampInt = (v: string, min: number, max: number, fallback: number) => {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

// Bounds for the per-type duration fields (mirrors the backend validation).
const P = { periods: [1, 20], periodMinutes: [1, 240], maxSubstitutions: [0, 30] } as const;

export default function Impostazioni() {
  const { t, teamId, seasonId, editable } = useSession();

  const [loading, setLoading] = useState(true);
  const [srvEditable, setSrvEditable] = useState(true);
  // Global template (defaults applied to newly added types). Kept but not shown —
  // new types seed from the last existing type, falling back to these.
  const [defaults, setDefaults] = useState(MATCH_DURATION_DEFAULT);
  const [configs, setConfigs] = useState<MatchTypeConfig[]>([]);
  const [newType, setNewType] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!teamId || !seasonId) return;
    setLoading(true);
    try {
      const s = await api.settings(teamId, seasonId);
      setDefaults({ periods: s.periods, periodMinutes: s.periodMinutes, maxSubstitutions: s.maxSubstitutions });
      setConfigs(s.matchTypeConfigs);
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
    if (!configs.some((c) => c.name.toLowerCase() === v.toLowerCase())) {
      // Seed a new type from the last existing one, else the global defaults.
      const seed = configs[configs.length - 1] ?? defaults;
      setConfigs((prev) => [...prev, {
        name: v, periods: seed.periods, periodMinutes: seed.periodMinutes, maxSubstitutions: seed.maxSubstitutions,
      }]);
    }
    setNewType('');
  };
  const removeType = (i: number) => setConfigs((prev) => prev.filter((_, idx) => idx !== i));

  const setField = (i: number, key: keyof Omit<MatchTypeConfig, 'name'>, value: number) =>
    setConfigs((prev) => prev.map((c, idx) => (idx === i ? { ...c, [key]: value } : c)));

  const save = async () => {
    if (!teamId || !seasonId) return;
    setSaving(true); setError('');
    try {
      const res = await api.updateSettings(teamId, seasonId, {
        periods: defaults.periods,
        periodMinutes: defaults.periodMinutes,
        maxSubstitutions: defaults.maxSubstitutions,
        matchTypeConfigs: configs,
      });
      setDefaults({ periods: res.periods, periodMinutes: res.periodMinutes, maxSubstitutions: res.maxSubstitutions });
      setConfigs(res.matchTypeConfigs);
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

      {/* Match types, each with its own default duration */}
      <div className="card" style={{ marginBottom: '0.9rem' }}>
        <h3 className="settings-heading">{t('matchTypes')}</h3>
        <p className="muted" style={{ fontSize: '0.82rem', margin: '0 0 0.9rem' }}>{t('matchTypesHint')}</p>

        {configs.length === 0 && <span className="muted">{t('empty')}</span>}
        <div className="stack">
          {configs.map((c, i) => (
            <div key={`${c.name}-${i}`} className="type-config">
              <div className="type-config-head">
                <span className="tag tag-static">{c.name}</span>
                {canEdit && (
                  <button type="button" className="tag-x" title={t('delete')} onClick={() => removeType(i)}>
                    <IconClose size={13} />
                  </button>
                )}
              </div>
              <div className="type-config-fields">
                <NumField label={t('periodsShort')} value={c.periods} disabled={!canEdit}
                  min={P.periods[0]} max={P.periods[1]}
                  onChange={(n) => setField(i, 'periods', n)} />
                <NumField label={t('periodMinutesShort')} value={c.periodMinutes} disabled={!canEdit}
                  min={P.periodMinutes[0]} max={P.periodMinutes[1]}
                  onChange={(n) => setField(i, 'periodMinutes', n)} />
                <NumField label={t('maxSubstitutionsShort')} value={c.maxSubstitutions} disabled={!canEdit}
                  min={P.maxSubstitutions[0]} max={P.maxSubstitutions[1]}
                  onChange={(n) => setField(i, 'maxSubstitutions', n)} />
              </div>
            </div>
          ))}
        </div>

        {canEdit && (
          <div className="row" style={{ marginTop: '0.9rem', gap: '0.5rem' }}>
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

// A compact labelled integer input that clamps on blur.
function NumField({
  label, value, min, max, disabled, onChange,
}: { label: string; value: number; min: number; max: number; disabled?: boolean; onChange: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  return (
    <div className="field">
      <label>{label}</label>
      <input className="input" type="number" min={min} max={max} inputMode="numeric"
        value={text} disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => { const n = clampInt(text, min, max, value); setText(String(n)); onChange(n); }} />
    </div>
  );
}
