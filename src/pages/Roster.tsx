import { useCallback, useEffect, useState } from 'react';
import { api, type Kind, type Person } from '../lib/api';
import { useSession } from '../lib/session';
import type { TKey } from '../lib/i18n';
import PersonForm from '../components/PersonForm';
import { IconPlus, IconEdit, IconEye } from '../components/Icons';

export default function Roster({ kind }: { kind: Kind }) {
  const s = useSession();
  const { t, teamId, seasonId, editable } = s;
  const [rows, setRows] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Person | null | 'new'>(null);

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
        {editable && (
          <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
            <IconPlus /> {t('add')}
          </button>
        )}
      </div>

      {loading ? (
        <p className="empty">{t('loading')}</p>
      ) : rows.length === 0 ? (
        <p className="empty">{t('empty')}</p>
      ) : (
        <div className="stack">
          {rows.map((p) => (
            <div key={p.id} className="card interactive row" onClick={() => setEditing(p)} style={{ cursor: 'pointer' }}>
              <div className="avatar">{initials(p)}</div>
              <div className="row-main">
                <div className="row-title">{name(p)}</div>
                <div className="row-sub">
                  {p.role ? t(p.role as TKey) : t('unknown')}{p.phone ? ` · ${p.phone}` : ''}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={(e) => { e.stopPropagation(); setEditing(p); }}
                title={editable ? t('edit') : ''}>
                {editable ? <IconEdit /> : <IconEye />}
              </button>
              {editable && (
                <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); remove(p); }}>
                  {t('delete')}
                </button>
              )}
            </div>
          ))}
        </div>
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
