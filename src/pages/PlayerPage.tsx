import { useCallback, useEffect, useState } from 'react';
import { api, type Person, type PlayerStats } from '../lib/api';
import { useSession } from '../lib/session';
import { useNav } from '../lib/nav';
import type { TKey } from '../lib/i18n';
import PersonFields from '../components/PersonFields';
import PersonForm from '../components/PersonForm';
import { IconBack, IconEdit } from '../components/Icons';

type Tab = 'registry' | 'statistics';

export default function PlayerPage({ playerId }: { playerId: string }) {
  const s = useSession();
  const { t, teamId, seasonId, editable } = s;
  const nav = useNav();

  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('registry');
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!teamId || !seasonId) return;
    setLoading(true);
    try {
      const roster = await api.roster('players', teamId, seasonId);
      setPerson(roster.find((p) => p.id === playerId) ?? null);
    } finally {
      setLoading(false);
    }
  }, [teamId, seasonId, playerId]);

  useEffect(() => { load(); }, [load]);

  const save = async (data: Partial<Person>) => {
    if (!teamId || !seasonId) return;
    await api.updatePerson('players', teamId, seasonId, playerId, data);
    setEditing(false);
    await load();
  };

  const name = person
    ? [person.lastName, person.firstName].filter(Boolean).join(' ') || t('unknown')
    : t('unknown');
  const initials = person
    ? ([person.firstName?.[0], person.lastName?.[0]].filter(Boolean).join('') || '?').toUpperCase()
    : '?';

  return (
    <div>
      <div className="page-head">
        <button className="btn btn-ghost btn-sm btn-icon" onClick={nav.close} title={t('back')}>
          <IconBack />
        </button>
        <div className="avatar">{initials}</div>
        <div className="row-main">
          <h2 className="title" style={{ margin: 0 }}>{name}</h2>
          {person?.role && <div className="row-sub">{t(person.role as TKey)}</div>}
        </div>
        {editable && person && (
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(true)} title={t('edit')}>
            <IconEdit />
          </button>
        )}
      </div>

      <div className="segmented tabs" style={{ marginBottom: '1rem' }}>
        <button type="button" className={tab === 'registry' ? 'active' : ''} onClick={() => setTab('registry')}>
          {t('registry')}
        </button>
        <button type="button" className={tab === 'statistics' ? 'active' : ''} onClick={() => setTab('statistics')}>
          {t('statistics')}
        </button>
      </div>

      {loading ? (
        <p className="empty">{t('loading')}</p>
      ) : !person ? (
        <p className="empty">{t('empty')}</p>
      ) : tab === 'registry' ? (
        <PersonFields kind="players" person={person} />
      ) : (
        <StatsTab teamId={teamId!} seasonId={seasonId!} playerId={playerId} />
      )}

      {editing && person && (
        <PersonForm kind="players" initial={person} readOnly={!editable}
          onSave={save} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

function StatsTab({ teamId, seasonId, playerId }: { teamId: string; seasonId: string; playerId: string }) {
  const { t, lang } = useSession();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.playerStats(teamId, seasonId, playerId)
      .then((r) => { if (alive) setStats(r); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [teamId, seasonId, playerId]);

  if (loading) return <p className="empty">{t('loading')}</p>;
  if (!stats) return <p className="empty">{t('noStats')}</p>;

  const cards: { label: TKey; value: string | number }[] = [
    { label: 'totalMinutes', value: `${stats.totalMinutes}′` },
    { label: 'matchesPlayed', value: stats.matchesPlayed },
    { label: 'matchesStarted', value: stats.matchesStarted },
    { label: 'goals', value: stats.goals },
    { label: 'subsInLabel', value: stats.subsIn },
    { label: 'subsOutLabel', value: stats.subsOut },
    { label: 'yellowCards', value: stats.yellowCards },
    { label: 'redCards', value: stats.redCards },
  ];

  const fmtDate = (v: string) => {
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d.toLocaleDateString(lang, { day: '2-digit', month: 'short' });
  };

  return (
    <div>
      <div className="stat-grid">
        {cards.map((c) => (
          <div className="stat-card" key={c.label}>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{t(c.label)}</div>
          </div>
        ))}
      </div>

      {stats.minutesByMatchType.length > 0 && (
        <>
          <h3 className="settings-heading">{t('minutesByType')}</h3>
          <div className="stack" style={{ marginBottom: '1rem' }}>
            {stats.minutesByMatchType.map((m) => (
              <div key={m.matchType} className="card row" style={{ padding: '0.6rem 0.9rem' }}>
                <span className="tag tag-static">{m.matchType}</span>
                <span className="row-main" />
                <strong>{m.minutes}′</strong>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 className="settings-heading">{t('perMatch')}</h3>
      {stats.perMatch.length === 0 ? (
        <p className="empty">{t('noMatches')}</p>
      ) : (
        <div className="stack">
          {stats.perMatch.map((m) => (
            <div key={m.matchId} className="card row" style={{ padding: '0.6rem 0.9rem', gap: '0.6rem' }}>
              <div style={{ minWidth: 46 }} className="row-sub">{fmtDate(m.date)}</div>
              <div className="row-main">
                <div className="row-title" style={{ fontSize: '0.9rem' }}>{m.opponent}</div>
                <div className="match-meta">
                  <span className="tag tag-static">{m.matchType}</span>
                  {m.starter && <span className="pill pill-c" title={t('titolare')}>{t('starterShort')}</span>}
                  {m.goals > 0 && <span className="row-sub">⚽ {m.goals}</span>}
                  {m.yellowCards > 0 && <span className="chip-card chip-yellow" />}
                  {m.redCards > 0 && <span className="chip-card chip-red" />}
                </div>
              </div>
              <strong>{m.minutes}′</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
