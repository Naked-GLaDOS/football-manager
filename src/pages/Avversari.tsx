import { useCallback, useEffect, useState } from 'react';
import { api, type OpponentGroup, type OpponentMatch, matchTitle, type OpponentVenue } from '../lib/api';
import { useSession } from '../lib/session';
import { useNav } from '../lib/nav';
import type { Lang } from '../lib/i18n';
import { IconShirt, IconCheck, IconEdit } from '../components/Icons';

// 2023-01-01 (UTC) is a Sunday, so +dow lands on the wanted weekday (JS getDay).
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const weekdayLabel = (dow: number, lang: Lang) =>
  new Date(Date.UTC(2023, 0, 1 + dow)).toLocaleDateString(lang, { weekday: 'long', timeZone: 'UTC' });

// The Avversari page: one card per opposing team faced this season, showing where
// they play (editable) and, match by match, the opponent line-ups we recorded.
export default function Avversari() {
  const s = useSession();
  const { t, teamId, seasonId } = s;
  const [groups, setGroups] = useState<OpponentGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!teamId || !seasonId) return;
    setLoading(true);
    try { setGroups(await api.opponents(teamId, seasonId)); }
    finally { setLoading(false); }
  }, [teamId, seasonId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="empty">{t('loading')}</p>;
  if (groups.length === 0) return <p className="empty">{t('noOpponents')}</p>;

  return (
    <div className="stack" style={{ gap: '1rem' }}>
      {groups.map((g) => (
        <OpponentCard key={g.name} group={g} canEdit={s.editable} lang={s.lang}
          teamId={teamId!} seasonId={seasonId!} onSaved={load} />
      ))}
    </div>
  );
}

function OpponentCard({ group, canEdit, lang, teamId, seasonId, onSaved }: {
  group: OpponentGroup; canEdit: boolean; lang: Lang; teamId: string; seasonId: string; onSaved: () => void;
}) {
  const { t, me } = useSession();
  const nav = useNav();
  const [editing, setEditing] = useState(false);
  const teamName = me?.teams.find((tm) => tm.id === teamId)?.name ?? t('team');
  const v = group.venue;
  const hasVenue = !!(v && (v.fieldName || v.address || v.matchDay != null || v.matchTime));

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'center' }}>
        <h3 className="settings-heading row-main" style={{ margin: 0 }}>{group.name}</h3>
        {canEdit && !editing && (
          <button className="btn btn-ghost btn-sm btn-icon" title={t('edit')} onClick={() => setEditing(true)}>
            <IconEdit />
          </button>
        )}
      </div>

      {editing ? (
        <VenueForm venue={v} name={group.name} teamId={teamId} seasonId={seasonId} lang={lang}
          onDone={() => { setEditing(false); onSaved(); }} onCancel={() => setEditing(false)} />
      ) : (
        <div className="detail-list" style={{ marginTop: '0.4rem' }}>
          {hasVenue ? (
            <>
              {v?.fieldName && <DetailRow label={t('opponentField')} value={v.fieldName} />}
              {v?.address && <DetailRow label={t('opponentAddress')} value={v.address} />}
              {v?.matchDay != null && <DetailRow label={t('opponentDay')} value={weekdayLabel(v.matchDay, lang)} />}
              {v?.matchTime && <DetailRow label={t('opponentTime')} value={v.matchTime} />}
            </>
          ) : (
            <p className="muted" style={{ fontSize: '0.82rem', margin: '0.2rem 0' }}>{t('opponentVenue')} —</p>
          )}
        </div>
      )}

      <h4 className="settings-heading" style={{ marginBottom: '0.5rem' }}>{t('opponentPlayers')}</h4>
      <div className="stack" style={{ gap: '0.7rem' }}>
        {group.matches.map((m) => (
          <MatchLineup key={m.id} match={m} lang={lang} title={matchTitle(teamName, group.name, m.isHome)}
            onOpen={() => nav.open({ type: 'match', id: m.id })} />
        ))}
      </div>
    </div>
  );
}

function MatchLineup({ match, lang, title, onOpen }: {
  match: OpponentMatch; lang: Lang; title: string; onOpen: () => void;
}) {
  const { t } = useSession();
  const dateLabel = new Date(match.date).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
  const players = [...match.opponentLineup].sort((a, b) => {
    if (a.shirtNumber !== b.shirtNumber) {
      if (a.shirtNumber == null) return 1;
      if (b.shirtNumber == null) return -1;
      return a.shirtNumber - b.shirtNumber;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return (
    <div className="subcard">
      <button className="link-row" onClick={onOpen} style={{ width: '100%' }}>
        <span className="row-main ellipsis" style={{ textAlign: 'left' }}>{title}</span>
        <span className="muted" style={{ fontSize: '0.78rem' }}>{dateLabel}</span>
      </button>
      {players.length === 0 ? (
        <p className="muted" style={{ fontSize: '0.8rem', margin: '0.4rem 0 0' }}>
          {t('noOpponentLineup')} · <button className="linklike" onClick={onOpen}>{t('openMatch')}</button>
        </p>
      ) : (
        <div className="lineup-grid" style={{ marginTop: '0.5rem' }}>
          {players.map((l) => (
            <div key={l.id} className={`lineup-card${l.starter ? '' : ' bench'}`}>
              <span className="shirt-badge"><IconShirt size={13} /> {l.shirtNumber ?? '–'}</span>
              <span className="lineup-name ellipsis">{l.name}</span>
              {l.captain && <span className="pill pill-c">{t('captainShort')}</span>}
              {l.viceCaptain && <span className="pill pill-v">{t('viceCaptainShort')}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VenueForm({ venue, name, teamId, seasonId, lang, onDone, onCancel }: {
  venue: OpponentVenue | null; name: string; teamId: string; seasonId: string; lang: Lang;
  onDone: () => void; onCancel: () => void;
}) {
  const { t } = useSession();
  const [fieldName, setFieldName] = useState(venue?.fieldName ?? '');
  const [address, setAddress] = useState(venue?.address ?? '');
  const [matchDay, setMatchDay] = useState<string>(venue?.matchDay != null ? String(venue.matchDay) : '');
  const [matchTime, setMatchTime] = useState(venue?.matchTime ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.saveOpponentVenue(teamId, seasonId, {
        name,
        fieldName: fieldName.trim() || null,
        address: address.trim() || null,
        matchDay: matchDay === '' ? null : parseInt(matchDay, 10),
        matchTime: matchTime.trim() || null,
      });
      onDone();
    } catch (err: any) {
      setError(err.message || 'Error'); setSaving(false);
    }
  };

  return (
    <div className="grid-fields" style={{ margin: '0.6rem 0' }}>
      <div className="field">
        <label>{t('opponentField')}</label>
        <input className="input" value={fieldName} onChange={(e) => setFieldName(e.target.value)} />
      </div>
      <div className="field">
        <label>{t('opponentAddress')}</label>
        <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="field">
        <label>{t('opponentDay')}</label>
        <select className="select" value={matchDay} onChange={(e) => setMatchDay(e.target.value)}>
          <option value="">{t('noDaySet')}</option>
          {WEEKDAY_ORDER.map((dow) => <option key={dow} value={dow}>{weekdayLabel(dow, lang)}</option>)}
        </select>
      </div>
      <div className="field">
        <label>{t('opponentTime')}</label>
        <input className="input" type="time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} />
      </div>
      {error && <p className="error" style={{ gridColumn: '1 / -1' }}>{error}</p>}
      <div className="modal-actions" style={{ gridColumn: '1 / -1' }}>
        <button className="btn btn-ghost" onClick={onCancel}>{t('cancel')}</button>
        <button className="btn btn-primary" disabled={saving} onClick={save}>
          {saving ? t('loading') : <><IconCheck /> {t('save')}</>}
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <div className="detail-main">
        <div className="detail-label">{label}</div>
        <div className="detail-value">{value}</div>
      </div>
    </div>
  );
}
