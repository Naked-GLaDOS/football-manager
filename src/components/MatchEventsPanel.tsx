import { useMemo, useState } from 'react';
import { api, type Match, type MatchDuration, type MatchEvent, type NewMatchEvent, type Person } from '../lib/api';
import { useSession } from '../lib/session';
import { IconPlus, IconTrash, IconBall, IconSwap, IconArrowUp, IconArrowDown } from './Icons';

export const personName = (p: { firstName: string | null; lastName: string | null } | null, fallback: string) =>
  (p ? [p.lastName, p.firstName].filter(Boolean).join(' ') : '') || fallback;

type EventKind = MatchEvent['type'];
type SubMode = 'own' | 'opponent';
type GoalMode = 'own' | 'opponent';

export default function MatchEventsPanel({
  match, players, duration, canEdit, teamId, seasonId, onUpdated,
}: {
  match: Match;
  players: Person[];
  duration: MatchDuration;
  canEdit: boolean;
  teamId: string;
  seasonId: string;
  onUpdated: (m: Match) => void;
}) {
  const { t } = useSession();

  const periodLabel = (p: number) => {
    if (duration.periods === 2) return p === 1 ? t('firstHalf') : t('secondHalf');
    return `${p}º ${t('periodN')}`;
  };
  const moment = (e: Pick<MatchEvent, 'period' | 'minute'>): string | null => {
    const parts: string[] = [];
    if (e.minute != null) parts.push(`${e.minute}'`);
    if (e.period != null) parts.push(periodLabel(e.period));
    return parts.length ? parts.join(' ') : null;
  };
  const pName = (p: { firstName: string | null; lastName: string | null } | null) => personName(p, t('unknown'));

  const periodOptions = useMemo(
    () => Array.from({ length: duration.periods }, (_, i) => i + 1),
    [duration.periods],
  );

  // Score derived from goal events
  const ownGoals = match.events.filter((e) => e.type === 'GOAL' && e.forOwnTeam).length;
  const oppGoals = match.events.filter((e) => e.type === 'GOAL' && !e.forOwnTeam).length;
  const hasGoalEvents = match.events.some((e) => e.type === 'GOAL');
  const result = ownGoals > oppGoals ? 'WIN' : ownGoals < oppGoals ? 'LOSS' : 'DRAW';

  // Only own-team subs count toward the limit
  const subsUsed = match.events.filter((e) => e.type === 'SUBSTITUTION' && !e.isOpponentSub).length;
  const opponentSubsUsed = match.events.filter((e) => e.type === 'SUBSTITUTION' && e.isOpponentSub).length;
  const subsFull = duration.maxSubstitutions > 0 && subsUsed >= duration.maxSubstitutions;

  const [kind, setKind] = useState<EventKind>('SUBSTITUTION');
  const [subMode, setSubMode] = useState<SubMode>('own');
  const [goalMode, setGoalMode] = useState<GoalMode>('own');
  const [isOwnGoal, setIsOwnGoal] = useState(false);
  const [period, setPeriod] = useState('1');
  const [minute, setMinute] = useState('');
  const [playerInId, setPlayerInId] = useState('');
  const [playerOutId, setPlayerOutId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [card, setCard] = useState<'YELLOW' | 'RED'>('YELLOW');
  const [opponentPlayerName, setOpponentPlayerName] = useState('');
  const [opponentPlayerInName, setOpponentPlayerInName] = useState('');
  const [opponentPlayerOutName, setOpponentPlayerOutName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setMinute('');
    setPlayerInId(''); setPlayerOutId(''); setPlayerId('');
    setCard('YELLOW');
    setOpponentPlayerName(''); setOpponentPlayerInName(''); setOpponentPlayerOutName('');
    setIsOwnGoal(false);
  };

  const switchKind = (k: EventKind) => {
    setKind(k);
    setSubMode('own'); setGoalMode('own'); setIsOwnGoal(false);
    setPeriod('1'); setMinute('');
    resetForm(); setError('');
  };

  const switchSubMode = (m: SubMode) => {
    setSubMode(m);
    setPlayerInId(''); setPlayerOutId('');
    setOpponentPlayerInName(''); setOpponentPlayerOutName('');
    setPeriod(m === 'own' ? '1' : '');
    setMinute(''); setError('');
  };

  const switchGoalMode = (m: GoalMode) => {
    setGoalMode(m);
    setPlayerId(''); setOpponentPlayerName(''); setIsOwnGoal(false); setError('');
  };

  const optPeriod = period === '' ? null : parseInt(period, 10);
  const optMinute = minute.trim() === '' ? null : parseInt(minute, 10);

  const periodRequired = kind === 'SUBSTITUTION' && subMode === 'own';

  const canAdd: boolean =
    kind === 'SUBSTITUTION'
      ? subMode === 'opponent'
        ? true
        : !!playerInId && !!playerOutId && playerInId !== playerOutId &&
          optMinute != null && optMinute >= 1 && optPeriod != null && !subsFull
      : kind === 'GOAL'
        ? goalMode === 'own' ? !!playerId : true
        : !!playerId; // CARD

  const addEvent = async () => {
    if (!canAdd) return;
    setBusy(true); setError('');
    let payload: NewMatchEvent;
    if (kind === 'SUBSTITUTION') {
      if (subMode === 'opponent') {
        payload = {
          type: 'SUBSTITUTION', isOpponentSub: true,
          period: optPeriod, minute: optMinute,
          opponentPlayerInName: opponentPlayerInName.trim() || null,
          opponentPlayerOutName: opponentPlayerOutName.trim() || null,
        };
      } else {
        payload = {
          type: 'SUBSTITUTION',
          period: optPeriod as number, minute: optMinute as number,
          playerInId, playerOutId,
        };
      }
    } else if (kind === 'CARD') {
      payload = { type: 'CARD', period: optPeriod, minute: optMinute, playerId, card };
    } else {
      // GOAL
      payload = {
        type: 'GOAL', period: optPeriod, minute: optMinute,
        ...(goalMode === 'own' ? { playerId } : { opponentPlayerName: opponentPlayerName.trim() || null }),
        isOwnGoal,
      };
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

  const eventVisual = (e: MatchEvent): { icon: React.ReactNode; cls: string } => {
    if (e.type === 'GOAL') {
      if (e.isOwnGoal) return { icon: <IconBall size={15} />, cls: 'goal-own-goal' };
      if (!e.forOwnTeam) return { icon: <IconBall size={15} />, cls: 'goal-opponent' };
      return { icon: <IconBall size={15} />, cls: '' };
    }
    if (e.type === 'CARD') return { icon: null, cls: e.card === 'RED' ? 'card-red' : 'card-yellow' };
    if (e.isOpponentSub) return { icon: <IconSwap size={15} />, cls: 'sub-opponent' };
    return { icon: <IconSwap size={15} />, cls: '' };
  };

  const eventLines = (e: MatchEvent): { title: React.ReactNode; sub?: React.ReactNode } => {
    if (e.type === 'SUBSTITUTION') {
      if (e.isOpponentSub) {
        const inName = e.opponentPlayerInName;
        const outName = e.opponentPlayerOutName;
        return {
          title: t('opponentSubstitution'),
          sub: (inName || outName)
            ? <span className="inline-ico">
                {inName && <><IconArrowUp /> {inName}</>}
                {inName && outName && <span style={{ margin: '0 0.25rem', color: 'var(--muted)' }}>/</span>}
                {outName && <><IconArrowDown /> {outName}</>}
              </span>
            : undefined,
        };
      }
      return {
        title: <span className="inline-ico"><IconArrowUp /> {pName(e.playerIn)}</span>,
        sub: <span className="inline-ico"><IconArrowDown /> {pName(e.playerOut)}</span>,
      };
    }
    if (e.type === 'CARD') {
      return { title: pName(e.player), sub: e.card === 'RED' ? t('red') : t('yellow') };
    }
    // GOAL
    if (e.isOwnGoal) {
      if (e.player) return { title: pName(e.player), sub: t('ownGoal') };
      // Opponent player scored own goal (benefits us)
      return { title: e.opponentPlayerName || t('unknown'), sub: t('goalOwnGoalFor') };
    }
    if (e.forOwnTeam) {
      return { title: pName(e.player), sub: t('goal') };
    }
    // Opponent scored
    return { title: e.opponentPlayerName || t('unknown'), sub: t('goalOpponentLabel') };
  };

  const addLabel =
    kind === 'SUBSTITUTION'
      ? subMode === 'opponent' ? t('addOpponentSub') : t('addSubstitution')
      : kind === 'CARD' ? t('addCard') : t('addGoal');

  return (
    <div>
      {/* Score display */}
      {hasGoalEvents && (
        <div className="card score-display" style={{ marginBottom: '0.9rem' }}>
          <div className="score-numbers">
            <span className="score-num">{ownGoals}</span>
            <span className="score-sep">–</span>
            <span className="score-num">{oppGoals}</span>
          </div>
          <div className={`result-badge result-${result.toLowerCase()}`}>
            {t(result === 'WIN' ? 'resultWin' : result === 'LOSS' ? 'resultLoss' : 'resultDraw')}
          </div>
        </div>
      )}

      {/* Substitution counters */}
      <div className="card" style={{ marginBottom: '0.9rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: opponentSubsUsed > 0 ? '0.5rem' : 0 }}>
          <span className="settings-heading" style={{ margin: 0 }}>{t('substitutionsUsed')}</span>
          <span className={`subcount${subsFull ? ' full' : ''}`}>{subsUsed} / {duration.maxSubstitutions}</span>
        </div>
        {opponentSubsUsed > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{t('opponentSubsUsed')}</span>
            <span className="subcount" style={{ fontSize: '0.9rem' }}>{opponentSubsUsed}</span>
          </div>
        )}
      </div>

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

      {canEdit && (
        <div className="card" style={{ marginBottom: '0.9rem' }}>
          {/* Top-level event kind selector */}
          <div className="segmented" style={{ marginBottom: '0.9rem', width: '100%', display: 'flex' }}>
            <button type="button" className={kind === 'SUBSTITUTION' ? 'active' : ''} style={{ flex: 1 }}
              onClick={() => switchKind('SUBSTITUTION')}>{t('substitution')}</button>
            <button type="button" className={kind === 'CARD' ? 'active' : ''} style={{ flex: 1 }}
              onClick={() => switchKind('CARD')}>{t('card')}</button>
            <button type="button" className={kind === 'GOAL' ? 'active' : ''} style={{ flex: 1 }}
              onClick={() => switchKind('GOAL')}>{t('goal')}</button>
          </div>

          <div className="grid-fields">
            {/* ── SUBSTITUTION ── */}
            {kind === 'SUBSTITUTION' && (
              <>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <div className="segmented" style={{ width: '100%', display: 'flex' }}>
                    <button type="button" className={subMode === 'own' ? 'active' : ''} style={{ flex: 1 }}
                      onClick={() => switchSubMode('own')}>{t('ownTeam')}</button>
                    <button type="button" className={subMode === 'opponent' ? 'active' : ''} style={{ flex: 1 }}
                      onClick={() => switchSubMode('opponent')}>{t('opponentTeam')}</button>
                  </div>
                </div>

                {subMode === 'own' && (
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

                {subMode === 'opponent' && (
                  <>
                    <div className="field">
                      <label>{t('opponentPlayerOut')}</label>
                      <input className="input" value={opponentPlayerOutName}
                        onChange={(e) => setOpponentPlayerOutName(e.target.value)}
                        placeholder={t('opponentName')} />
                    </div>
                    <div className="field">
                      <label>{t('opponentPlayerIn')}</label>
                      <input className="input" value={opponentPlayerInName}
                        onChange={(e) => setOpponentPlayerInName(e.target.value)}
                        placeholder={t('opponentName')} />
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── CARD ── */}
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

            {/* ── GOAL ── */}
            {kind === 'GOAL' && (
              <>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <div className="segmented" style={{ width: '100%', display: 'flex' }}>
                    <button type="button" className={goalMode === 'own' ? 'active' : ''} style={{ flex: 1 }}
                      onClick={() => switchGoalMode('own')}>{t('ownTeam')}</button>
                    <button type="button" className={goalMode === 'opponent' ? 'active' : ''} style={{ flex: 1 }}
                      onClick={() => switchGoalMode('opponent')}>{t('opponentTeam')}</button>
                  </div>
                </div>

                {goalMode === 'own' && (
                  <div className="field">
                    <label>{t('scorer')}</label>
                    <PlayerSelect players={players} value={playerId} onChange={setPlayerId} placeholder={t('selectPlayer')} />
                  </div>
                )}

                {goalMode === 'opponent' && (
                  <div className="field">
                    <label>{t('scorerName')} ({t('optional')})</label>
                    <input className="input" value={opponentPlayerName}
                      onChange={(e) => setOpponentPlayerName(e.target.value)}
                      placeholder={t('opponentName')} />
                  </div>
                )}

                <div className="field" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingTop: '0.3rem' }}>
                  <input
                    id="own-goal-check"
                    type="checkbox"
                    checked={isOwnGoal}
                    onChange={(e) => setIsOwnGoal(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }}
                  />
                  <label htmlFor="own-goal-check" style={{ cursor: 'pointer', userSelect: 'none', fontSize: '0.9rem' }}>
                    {t('ownGoal')}
                  </label>
                </div>
              </>
            )}

            {/* ── Period & Minute ── */}
            <div className="field">
              <label>{t('period')}{!periodRequired ? ` (${t('optional')})` : ''}</label>
              <select className="select" value={period} onChange={(e) => setPeriod(e.target.value)}>
                {!periodRequired && <option value="">—</option>}
                {periodOptions.map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}
              </select>
            </div>
            <div className="field">
              <label>{t('minute')}{!periodRequired ? ` (${t('optional')})` : ''}</label>
              <input className="input" type="number" min={1} max={240} inputMode="numeric"
                value={minute} onChange={(e) => setMinute(e.target.value)} placeholder="'" />
            </div>
          </div>

          {subsFull && kind === 'SUBSTITUTION' && subMode === 'own' && (
            <p className="error" style={{ marginTop: '0.6rem' }}>{t('subsLimitReached')}</p>
          )}
          {error && <p className="error" style={{ marginTop: '0.6rem' }}>{error}</p>}

          <button className="btn btn-primary btn-sm" style={{ marginTop: '0.8rem' }}
            disabled={!canAdd || busy} onClick={addEvent}>
            <IconPlus /> {addLabel}
          </button>
        </div>
      )}
    </div>
  );
}

export function PlayerSelect({
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
