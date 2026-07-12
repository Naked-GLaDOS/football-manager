import { useCallback, useEffect, useState } from 'react';
import { api, type Kind, type Person } from '../lib/api';
import { useSession } from '../lib/session';
import { useNav } from '../lib/nav';
import type { TKey } from '../lib/i18n';
import PersonForm from '../components/PersonForm';
import PersonDetail from '../components/PersonDetail';
import BulkCopyModal from '../components/BulkCopyModal';
import { exportRosterPdf } from '../lib/exportPdf';
import { IconPlus, IconEdit, IconCopy, IconDownload } from '../components/Icons';

export default function Roster({ kind }: { kind: Kind }) {
  const s = useSession();
  const { t, teamId, seasonId, editable, me } = s;
  const nav = useNav();
  const [rows, setRows] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Person | null | 'new'>(null);
  const [viewing, setViewing] = useState<Person | null>(null);
  const [copying, setCopying] = useState(false);

  const teamName = me?.teams.find((tm) => tm.id === teamId)?.name ?? t('team');
  const seasonName = s.season?.name ?? '';

  const load = useCallback(async () => {
    if (!teamId || !seasonId) return;
    setLoading(true);
    try { setRows(await api.roster(kind, teamId, seasonId)); }
    finally { setLoading(false); }
  }, [kind, teamId, seasonId]);

  useEffect(() => { load(); }, [load]);

  const save = async (data: Partial<Person>) => {
    if (!teamId || !seasonId) return;
    if (editing === 'new') await api.createPerson(kind, teamId, seasonId, data);
    else if (editing) await api.updatePerson(kind, teamId, seasonId, editing.id, data);
    setEditing(null);
    await load();
  };

  const remove = async (p: Person) => {
    if (!teamId || !seasonId || !confirm(t('confirmDelete'))) return;
    await api.deletePerson(kind, teamId, seasonId, p.id);
    await load();
  };

  const name = (p: Person) => [p.lastName, p.firstName].filter(Boolean).join(' ') || t('unknown');
  const initials = (p: Person) =>
    ([p.firstName?.[0], p.lastName?.[0]].filter(Boolean).join('') || '?').toUpperCase();

  if (!teamId) return <p className="empty">{t('noTeam')}</p>;

  return (
    <div>
      <div className="section-head">
        <h2 className="title">{kind === 'players' ? t('players') : t('staff')}</h2>
        <div className="head-actions">
          {kind === 'players' && rows.length > 0 && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setCopying(true)} title={t('copyData')}>
                <IconCopy /> {t('copyData')}
              </button>
              <button className="btn btn-ghost btn-sm" title={t('exportPdf')}
                onClick={() => exportRosterPdf(rows, kind, teamName, seasonName, t)}>
                <IconDownload /> {t('exportPdf')}
              </button>
            </>
          )}
          {editable && (
            <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
              <IconPlus /> {t('add')}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="empty">{t('loading')}</p>
      ) : rows.length === 0 ? (
        <p className="empty">{t('empty')}</p>
      ) : (
        <div className="stack">
          {rows.map((p) => (
            <div key={p.id} className="card interactive row"
              onClick={() => (kind === 'players' ? nav.open({ type: 'player', id: p.id }) : setViewing(p))}
              style={{ cursor: 'pointer' }}>
              <div className="avatar">{initials(p)}</div>
              <div className="row-main">
                <div className="row-title">{name(p)}</div>
                <div className="row-sub">
                  {p.role ? t(p.role as TKey) : t('unknown')}
                  {p.registrationNumber ? ` · ${t('registrationNumber')} ${p.registrationNumber}` : ''}
                </div>
              </div>
              {editable && (
                <button className="btn btn-ghost btn-sm btn-icon" onClick={(e) => { e.stopPropagation(); setEditing(p); }}
                  title={t('edit')}>
                  <IconEdit />
                </button>
              )}
              {editable && (
                <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); remove(p); }}>
                  {t('delete')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {viewing && (
        <PersonDetail
          kind={kind}
          person={viewing}
          canEdit={editable}
          onEdit={() => { const p = viewing; setViewing(null); setEditing(p); }}
          onClose={() => setViewing(null)}
        />
      )}

      {copying && (
        <BulkCopyModal kind={kind} people={rows}
          title={[teamName, seasonName].filter(Boolean).join(' · ')}
          onClose={() => setCopying(false)} />
      )}

      {editing !== null && (
        <PersonForm
          kind={kind}
          initial={editing === 'new' ? null : editing}
          readOnly={!editable}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
