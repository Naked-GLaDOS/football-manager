import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, resolveMatchDuration, type Match, type MatchInput, type Person, type SeasonSettings } from '../lib/api';
import { useSession } from '../lib/session';
import { useNav } from '../lib/nav';
import type { TKey } from '../lib/i18n';
import MatchEventsPanel, { personName } from '../components/MatchEventsPanel';
import FormationEditor, {
  initFromMatch, initFromDistinta, META_FIELDS, STAFF_FIELDS, type EditorInit,
} from '../components/FormationEditor';
import { MatchForm } from './Matches';
import { IconBack, IconEdit, IconCheck, IconUpload, IconList, IconShirt } from '../components/Icons';

type Tab = 'formation' | 'events' | 'comment';

export default function MatchPage({ matchId }: { matchId: string }) {
  const s = useSession();
  const { t, teamId, seasonId, editable, me } = s;
  const nav = useNav();

  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Person[]>([]);
  const [settings, setSettings] = useState<SeasonSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('formation');
  const [editingMeta, setEditingMeta] = useState(false);

  const teamName = useMemo(
    () => me?.teams.find((tm) => tm.id === teamId)?.name ?? t('team'),
    [me, teamId, t],
  );

  const load = useCallback(async () => {
    if (!teamId || !seasonId) return;
    setLoading(true);
    try {
      const [matches, p, st] = await Promise.all([
        api.matches(teamId, seasonId),
        api.roster('players', teamId, seasonId),
        api.settings(teamId, seasonId),
      ]);
      setMatch(matches.find((m) => m.id === matchId) ?? null);
      setPlayers(p);
      setSettings(st);
    } finally {
      setLoading(false);
    }
  }, [teamId, seasonId, matchId]);

  useEffect(() => { load(); }, [load]);

  const onUpdated = (m: Match) => setMatch(m);

  const saveMeta = async (data: MatchInput) => {
    if (!teamId || !seasonId || !match) return;
    const updated = await api.updateMatch(teamId, seasonId, match.id, data);
    setMatch(updated);
    setEditingMeta(false);
  };

  const saveComment = async (data: { comment?: string; opponentComment?: string }) => {
    if (!teamId || !seasonId || !match) return;
    const updated = await api.updateMatch(teamId, seasonId, match.id, data);
    setMatch(updated);
  };

  if (loading) return (
    <div><BackHead title="" onBack={nav.close} /><p className="empty">{t('loading')}</p></div>
  );
  if (!match || !settings) return (
    <div><BackHead title="" onBack={nav.close} /><p className="empty">{t('empty')}</p></div>
  );

  const dateLabel = new Date(match.date).toLocaleDateString(s.lang, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
  // This match's effective duration (its own override → type config → default).
  const duration = resolveMatchDuration(match, settings.matchTypeConfigs);

  return (
    <div>
      <div className="page-head">
        <button className="btn btn-ghost btn-sm btn-icon" onClick={nav.close} title={t('back')}>
          <IconBack />
        </button>
        <div className="row-main">
          <h2 className="title" style={{ margin: 0 }}>{teamName} vs {match.opponent}</h2>
          <div className="match-meta">
            <span className="muted" style={{ fontSize: '0.82rem' }}>{dateLabel}</span>
            <span className="tag tag-static">{match.matchType}</span>
            <span className="tag tag-static">{duration.periods}×{duration.periodMinutes}′</span>
          </div>
        </div>
        {editable && (
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingMeta(true)} title={t('edit')}>
            <IconEdit />
          </button>
        )}
      </div>

      <div className="segmented tabs" style={{ marginBottom: '1rem' }}>
        <button type="button" className={tab === 'formation' ? 'active' : ''} onClick={() => setTab('formation')}>{t('formation')}</button>
        <button type="button" className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>{t('events')}</button>
        <button type="button" className={tab === 'comment' ? 'active' : ''} onClick={() => setTab('comment')}>{t('comment')}</button>
      </div>

      {tab === 'formation' && (
        <FormationTab match={match} players={players} canEdit={editable}
          teamId={teamId!} seasonId={seasonId!} onUpdated={onUpdated} />
      )}
      {tab === 'events' && (
        <MatchEventsPanel match={match} players={players} duration={duration} canEdit={editable}
          teamId={teamId!} seasonId={seasonId!} onUpdated={onUpdated} />
      )}
      {tab === 'comment' && (
        <CommentTab match={match} canEdit={editable} onSave={saveComment} />
      )}

      {editingMeta && (
        <MatchForm initial={match} configs={settings.matchTypeConfigs} onSave={saveMeta} onClose={() => setEditingMeta(false)} />
      )}
    </div>
  );
}

function BackHead({ title, onBack }: { title: string; onBack: () => void }) {
  const { t } = useSession();
  return (
    <div className="page-head">
      <button className="btn btn-ghost btn-sm btn-icon" onClick={onBack} title={t('back')}><IconBack /></button>
      <h2 className="title" style={{ margin: 0 }}>{title}</h2>
    </div>
  );
}

// ── Formation tab: view + manual editor + distinta upload ──────────────────────
type Mode = 'view' | 'edit';

function FormationTab({ match, players, canEdit, teamId, seasonId, onUpdated }: {
  match: Match; players: Person[]; canEdit: boolean; teamId: string; seasonId: string; onUpdated: (m: Match) => void;
}) {
  const { t } = useSession();
  const [mode, setMode] = useState<Mode>('view');
  const [init, setInit] = useState<EditorInit | null>(null);
  const [banner, setBanner] = useState<{ warnings: string[]; unmatched: string[] } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const startManual = () => { setInit(initFromMatch(match)); setBanner(null); setError(''); setMode('edit'); };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true); setError('');
    try {
      const parsed = await api.parseDistinta(teamId, seasonId, match.id, file);
      const { init: seeded, warnings, unmatched } = initFromDistinta(parsed);
      // Merge distinta staff onto whatever the match already has where distinta is blank.
      setInit(seeded);
      setBanner({ warnings, unmatched });
      setMode('edit');
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setUploading(false);
    }
  };

  if (mode === 'edit' && init) {
    return (
      <FormationEditor match={match} players={players} teamId={teamId} seasonId={seasonId}
        init={init} banner={banner}
        onDone={(m) => { onUpdated(m); setMode('view'); }}
        onCancel={() => setMode('view')} />
    );
  }

  const lineName = (l: Match['lineup'][number]) => personName(l.player, t('unknown'));
  // Sort by shirt number first, then name; unnumbered players fall last.
  const byShirtThenName = (a: Match['lineup'][number], b: Match['lineup'][number]) => {
    const na = a.shirtNumber;
    const nb = b.shirtNumber;
    if (na !== nb) {
      if (na == null) return 1;
      if (nb == null) return -1;
      return na - nb;
    }
    return lineName(a).localeCompare(lineName(b), undefined, { sensitivity: 'base' });
  };
  const starters = match.lineup.filter((l) => l.starter).sort(byShirtThenName);
  const bench = match.lineup.filter((l) => !l.starter).sort(byShirtThenName);
  const staffShown = [...META_FIELDS, ...STAFF_FIELDS]
    .map((f) => ({ label: f.label as TKey, value: (match as any)[f.key] as string | null }))
    .filter((x) => x.value);
  const isEmpty = match.lineup.length === 0 && staffShown.length === 0;

  return (
    <div>
      {canEdit && (
        <div className="head-actions" style={{ marginBottom: '1rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={startManual}>
            <IconList /> {t('setFormationManually')}
          </button>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
            <IconUpload /> {uploading ? t('parsing') : t('uploadDistinta')}
            <input type="file" accept="application/pdf,.pdf" style={{ display: 'none' }}
              disabled={uploading} onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        </div>
      )}
      {error && <p className="error" style={{ marginBottom: '0.8rem' }}>{error}</p>}
      {canEdit && <p className="muted" style={{ fontSize: '0.78rem', margin: '0 0 1rem' }}>{t('distintaHint')}</p>}

      {isEmpty ? (
        <p className="empty">{t('noFormation')}</p>
      ) : (
        <>
          {starters.length > 0 && <h3 className="settings-heading">{t('starters')}</h3>}
          <div className="lineup-grid">
            {starters.map((l) => (
              <div key={l.id} className="lineup-card">
                <span className="shirt-badge"><IconShirt size={13} /> {l.shirtNumber ?? '–'}</span>
                <span className="lineup-name ellipsis">{lineName(l)}</span>
                {l.captain && <span className="pill pill-c" title={t('captain')}>{t('captainShort')}</span>}
                {l.viceCaptain && <span className="pill pill-v" title={t('viceCaptain')}>{t('viceCaptainShort')}</span>}
              </div>
            ))}
          </div>

          {bench.length > 0 && (
            <>
              <h3 className="settings-heading">{t('bench')}</h3>
              <div className="lineup-grid">
                {bench.map((l) => (
                  <div key={l.id} className="lineup-card bench">
                    <span className="shirt-badge"><IconShirt size={13} /> {l.shirtNumber ?? '–'}</span>
                    <span className="lineup-name ellipsis">{lineName(l)}</span>
                    {l.captain && <span className="pill pill-c">{t('captainShort')}</span>}
                    {l.viceCaptain && <span className="pill pill-v">{t('viceCaptainShort')}</span>}
                  </div>
                ))}
              </div>
            </>
          )}

          {staffShown.length > 0 && (
            <>
              <h3 className="settings-heading">{t('staffResponsibles')}</h3>
              <div className="detail-list">
                {staffShown.map((x) => (
                  <div className="detail-row" key={x.label}>
                    <div className="detail-main">
                      <div className="detail-label">{t(x.label)}</div>
                      <div className="detail-value">{x.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Comment tab ────────────────────────────────────────────────────────────────
// Two independent notes per match: one about the user's own team, one about the
// opponent. Each saves on its own so a coach can jot down either side alone.
function CommentTab({ match, canEdit, onSave }: {
  match: Match; canEdit: boolean;
  onSave: (data: { comment?: string; opponentComment?: string }) => Promise<void>;
}) {
  const { t } = useSession();
  return (
    <div className="stack" style={{ gap: '1.4rem' }}>
      <CommentField label={t('commentTeam')} placeholder={t('commentTeamPlaceholder')}
        value={match.comment ?? ''} canEdit={canEdit}
        onSave={(v) => onSave({ comment: v })} />
      <CommentField label={t('commentOpponent')} placeholder={t('commentOpponentPlaceholder')}
        value={match.opponentComment ?? ''} canEdit={canEdit}
        onSave={(v) => onSave({ opponentComment: v })} />
    </div>
  );
}

function CommentField({ label, placeholder, value, canEdit, onSave }: {
  label: string; placeholder: string; value: string; canEdit: boolean;
  onSave: (v: string) => Promise<void>;
}) {
  const { t } = useSession();
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = text !== value;

  // Keep the field in sync when the match reloads (e.g. after saving the other note).
  useEffect(() => { setText(value); }, [value]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(text);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3 className="settings-heading" style={{ marginTop: 0 }}>{label}</h3>
      <textarea className="textarea" value={text} disabled={!canEdit}
        placeholder={placeholder} onChange={(e) => setText(e.target.value)}
        style={{ minHeight: 150 }} />
      {canEdit && (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.6rem' }}
          disabled={!dirty || saving} onClick={save}>
          {saved ? <><IconCheck /> {t('saved')}</> : t('saveComment')}
        </button>
      )}
    </div>
  );
}
