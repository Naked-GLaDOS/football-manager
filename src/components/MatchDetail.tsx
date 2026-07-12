import { useMemo, useState } from 'react';
import { api, type Match, type MatchEvent, type NewMatchEvent, type Person, type SeasonSettings } from '../lib/api';
import { useSession } from '../lib/session';
import { IconPlus, IconCheck, IconTrash, IconEdit } from './Icons';

const personName = (p: { firstName: string | null; lastName: string | null } | null, fallback: string) =>
  (p ? [p.lastName, p.firstName].filter(Boolean).join(' ') : '') || fallback;

type EventKind = MatchEvent['type'];

export default function MatchDetail({
  match, players, settings, teamName, canEdit, teamId, seasonId, onUpdated, onEdit, onClose,
}: {
  match: Match;
  players: Person[];
  settings: SeasonSettings;
  teamName: string;
  canEdit: boolean;
  teamId: string;
  seasonId: string;
  onUpdated: (m: Match) => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { t } = useSession();

  // ── Localised labels for the "when" of an event ───────────────────────────
  const periodLabel = (p: number) => {
    if (settings.periods === 2) return p === 1 ? t('firstHalf') : t('secondHalf');
    return `${p}º ${t('periodN')}`;
  };
  const moment = (e: Pick<MatchEvent, 'period' | 'minute'>): string | null => {
    const parts: string[] = [];
    if (e.minute != null) parts.push(`${e.minute}'`);
    if (e.period != null) parts.push(periodLabel(e.period));
    return parts.length ? parts.join(' ') : null;
  };

  const pName = (p: { firstName: string | null; lastName: string | null } | null) =>
    personName(p, t('unknown'));

  const periodOptions = useMemo(
    () => Array.from({ length: settings.periods }, (_, i) => i + 1),
    [settings.periods],
  );

  const subsUsed = match.events.filter((e) => e.type === 'SUBSTITUTION').length;
  const subsFull = settings.maxSubstitutions > 0 && subsUsed >= settings.maxSubstitutions;

  // ── Add-event form state ──────────────────────────────────────────────────
  const [kind, setKind] = useState<EventKind>('SUBSTITUTION');
  const [period, setPeriod] = useState('1');
  const [minute, setMinute] = useState('');
  const [playerInId, setPlayerInId] = useState('');
  const [playerOutId, setPlayerOutId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [card, setCard] = useState<'YELLOW' | 'RED'>('YELLOW');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setMinute(''); setPlayerInId(''); setPlayerOutId(''); setPlayerId(''); setCard('YELLOW');
  };

  const optPeriod = period === '' ? null : parseInt(period, 10);
  const optMinute = minute.trim() === '' ? null : parseInt(minute, 10);

  const canAdd =
    kind === 'SUBSTITUTION'
      ? !!playerInId && !!playerOutId && playerInId !== playerOutId && optMinute != null && optPeriod != null && !subsFull
      : !!playerId;

  const addEvent = async () => {
    if (!canAdd) return;
    setBusy(true); setError('');
    let payload: NewMatchEvent;
    if (kind === 'SUBSTITUTION') {
      payload = { type: 'SUBSTITUTION', period: optPeriod as number, minute: optMinute as number, playerInId, playerOutId };
    } else if (kind === 'CARD') {
      payload = { type: 'CARD', period: optPeriod, minute: optMinute, playerId, card };
    } else {
      payload = { type: 'GOAL', period: optPeriod, minute: optMinute, playerId };
    }
    try {
      const updated = await api.addMatchEvent(teamId, seasonId, match.id, payload);
      onUpdated(updated);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setBusy(false);
    }
  };

  const removeEvent = async (e: MatchEvent) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      const updated = await api.deleteMatchEvent(teamId, seasonId, match.id, e.id);
      onUpdated(updated);
    } catch { /* ignore */ }
  };

  // ── Comment ───────────────────────────────────────────────────────────────
  const [comment, setComment] = useState(match.comment ?? '');
  const [savingComment, setSavingComment] = useState(false);
  const [commentSaved, setCommentSaved] = useState(false);
  const commentDirty = comment !== (match.comment ?? '');

  const saveComment = async () => {
    setSavingComment(true);
    try {
      const updated = await api.updateMatch(teamId, seasonId, match.id, { comment });
      onUpdated(updated);
      setCommentSaved(true);
      window.setTimeout(() => setCommentSaved(false), 1600);
    } finally {
      setSavingComment(false);
    }
  };

  // Event visual: icon + colour class per kind.
  const eventVisual = (e: MatchEvent) => {
    if (e.type === 'GOAL') return { icon: '⚽', cls: '' };
    if (e.type === 'CARD') return { icon: '', cls: e.card === 'RED' ? 'card-red' : 'card-yellow' };
    return { icon: '⇄', cls: '' };
  };

  const eventLines = (e: MatchEvent): { title: React.ReactNode; sub?: string } => {
    if (e.type === 'SUBSTITUTION') {
      return { title: <>▲ {pName(e.playerIn)}</>, sub: `▼ ${pName(e.playerOut)}` };
    }
    if (e.type === 'CARD') {
      return { title: pName(e.player), sub: e.card === 'RED' ? t('red') : t('yellow') };
    }
    return { title: pName(e.player), sub: t('goal') };
  };

  const title = `${teamName} vs ${match.opponent}`;
  const dateLabel = new Date(match.date).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />

        <div className="row" style={{ marginBottom: '0.4rem' }}>
          <h2 className="title row-main" style={{ margin: 0 }}>{title}</h2>
          {canEdit && (
            <button className="btn btn-ghost btn-sm btn-icon" onClick={onEdit} title={t('edit')}>
              <IconEdit />
            </button>
          )}
        </div>
        <div className="match-meta" style={{ marginBottom: '1rem' }}>
          <span className="muted" style={{ fontSize: '0.85rem' }}>{dateLabel}</span>
          <span className="tag tag-static">{match.matchType}</span>
        </div>

        {/* Substitution counter */}
        <div className="card" style={{ marginBottom: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="settings-heading" style={{ margin: 0 }}>{t('substitutionsUsed')}</span>
          <span className={`subcount${subsFull ? ' full' : ''}`}>{subsUsed} / {settings.maxSubstitutions}</span>
        </div>

        {/* Events list */}
        <h3 className="settings-heading">{t('events')}</h3>
        {match.events.length === 0 ? (
          <p className="muted" style={{ fontSize: '0.85rem', margin: '0 0 0.9rem' }}>{t('noEvents')}</p>
        ) : (
          <div className="stack" style={{ marginBottom: '1rem' }}>
            {match.events.map((e) => {
              const v = eventVisual(e);
              const lines = eventLines(e);
              const when = moment(e);
              return (
                <div key={e.id} className="event-row">
                  <div className={`event-icon ${v.cls}`}>{v.icon}</div>
                  <div className="event-main">
                    <div className="event-title">{lines.title}</div>
                    {lines.sub && <div className="event-sub">{lines.sub}</div>}
                  </div>
                  {when && <span className="event-time">{when}</span>}
                  {canEdit && (
                    <button className="btn btn-ghost btn-sm btn-icon" title={t('delete')} onClick={() => removeEvent(e)}>
                      <IconTrash />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add event */}
        {canEdit && (
          <div className="card" style={{ marginBottom: '0.9rem' }}>
            <div className="segmented" style={{ marginBottom: '0.9rem', width: '100%', display: 'flex' }}>
              <button type="button" className={kind === 'SUBSTITUTION' ? 'active' : ''} style={{ flex: 1 }}
                onClick={() => { setKind('SUBSTITUTION'); setError(''); }}>{t('substitution')}</button>
              <button type="button" className={kind === 'CARD' ? 'active' : ''} style={{ flex: 1 }}
                onClick={() => { setKind('CARD'); setError(''); }}>{t('card')}</button>
              <button type="button" className={kind === 'GOAL' ? 'active' : ''} style={{ flex: 1 }}
                onClick={() => { setKind('GOAL'); setError(''); }}>{t('goal')}</button>
            </div>

            <div className="grid-fields">
              {kind === 'SUBSTITUTION' && (
                <>
                  <div className="field">
                    <label>{t('playerOut')}</label>
                    <PlayerSelect players={players} value={playerOutId} onChange={setPlayerOutId} placeholder={t('selectPlayer')} />
                  </div>
                  <div className="field">
                    <label>{t('playerIn')}</label>
                    <PlayerSelect players={players} value={playerInId} onChange={setPlayerInId} placeholder={t('selectPlayer')} />
                  </div>
                </>
              )}

              {kind === 'CARD' && (
                <>
                  <div className="field">
                    <label>{t('player')}</label>
                    <PlayerSelect players={players} value={playerId} onChange={setPlayerId} placeholder={t('selectPlayer')} />
                  </div>
                  <div className="field">
                    <label>{t('cardColor')}</label>
                    <select className="select" value={card} onChange={(e) => setCard(e.target.value as 'YELLOW' | 'RED')}>
                      <option value="YELLOW">{t('yellow')}</option>
                      <option value="RED">{t('red')}</option>
                    </select>
                  </div>
                </>
              )}

              {kind === 'GOAL' && (
                <div className="field">
                  <label>{t('scorer')}</label>
                  <PlayerSelect players={players} value={playerId} onChange={setPlayerId} placeholder={t('selectPlayer')} />
                </div>
              )}

              {/* Moment: mandatory for substitutions, optional otherwise */}
              <div className="field">
                <label>{t('period')}{kind !== 'SUBSTITUTION' ? ` (${t('optional')})` : ''}</label>
                <select className="select" value={period} onChange={(e) => setPeriod(e.target.value)}>
                  {kind !== 'SUBSTITUTION' && <option value="">—</option>}
                  {periodOptions.map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}
                </select>
              </div>
              <div className="field">
                <label>{t('minute')}{kind !== 'SUBSTITUTION' ? ` (${t('optional')})` : ''}</label>
                <input className="input" type="number" min={0} max={240} inputMode="numeric"
                  value={minute} onChange={(e) => setMinute(e.target.value)} placeholder="'" />
              </div>
            </div>

            {subsFull && kind === 'SUBSTITUTION' && (
              <p className="error" style={{ marginTop: '0.6rem' }}>{t('subsLimitReached')}</p>
            )}
            {error && <p className="error" style={{ marginTop: '0.6rem' }}>{error}</p>}

            <button className="btn btn-primary btn-sm" style={{ marginTop: '0.8rem' }}
              disabled={!canAdd || busy} onClick={addEvent}>
              <IconPlus /> {kind === 'SUBSTITUTION' ? t('addSubstitution') : kind === 'CARD' ? t('addCard') : t('addGoal')}
            </button>
          </div>
        )}

        {/* Comment */}
        <h3 className="settings-heading">{t('comment')}</h3>
        <textarea className="textarea" value={comment} disabled={!canEdit}
          placeholder={t('commentPlaceholder')} onChange={(e) => setComment(e.target.value)} />
        {canEdit && (
          <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.6rem' }}
            disabled={!commentDirty || savingComment} onClick={saveComment}>
            {commentSaved ? <><IconCheck /> {t('saved')}</> : t('saveComment')}
          </button>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>{t('close')}</button>
        </div>
      </div>
    </div>
  );
}

function PlayerSelect({
  players, value, onChange, placeholder,
}: { players: Person[]; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {players.map((p) => (
        <option key={p.id} value={p.id}>{personName(p, '—')}</option>
      ))}
    </select>
  );
}
