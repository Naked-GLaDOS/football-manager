import { useCallback, useEffect, useState } from 'react';
import { api, type Kind, type Person } from '../lib/api';
import { useSession } from '../lib/session';
import type { TKey } from '../lib/i18n';
import PersonForm from '../components/PersonForm';
import { c, card, btn, btnDanger } from '../lib/ui';

export default function Roster({ kind }: { kind: Kind }) {
  const s = useSession();
  const { t, teamId, seasonId, editable } = s;
  const [rows, setRows] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Person | null | 'new'>(null);

  const load = useCallback(async () => {
    if (!teamId || !seasonId) return;
    setLoading(true);
    try {
      setRows(await api.roster(kind, teamId, seasonId));
    } finally {
      setLoading(false);
    }
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
    if (!teamId || !seasonId) return;
    if (!confirm(t('confirmDelete'))) return;
    await api.deletePerson(kind, teamId, seasonId, p.id);
    await load();
  };

  const name = (p: Person) =>
    [p.lastName, p.firstName].filter(Boolean).join(' ') || t('unknown');

  if (!teamId) return <p style={{ color: c.muted, padding: '2rem 0' }}>{t('noTeam')}</p>;

  return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>{kind === 'players' ? t('players') : t('staff')}</h2>
        {editable && <button style={btn} onClick={() => setEditing('new')}>+ {t('add')}</button>}
      </div>

      {loading ? (
        <p style={{ color: c.muted }}>{t('loading')}</p>
      ) : rows.length === 0 ? (
        <p style={{ color: c.muted }}>{t('empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {rows.map((p) => (
            <div key={p.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{name(p)}</div>
                <div style={{ color: c.muted, fontSize: '0.85rem' }}>
                  {p.role ? t(p.role as TKey) : t('unknown')}
                  {p.phone ? ` · ${p.phone}` : ''}
                </div>
              </div>
              <button style={btnLink} onClick={() => setEditing(p)}>{editable ? t('edit') : '👁'}</button>
              {editable && <button style={btnDanger} onClick={() => remove(p)}>{t('delete')}</button>}
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

const btnLink: React.CSSProperties = {
  background: 'transparent', color: c.text, border: `1px solid ${c.border}`,
  borderRadius: '0.5rem', padding: '0.4rem 0.7rem', fontSize: '0.85rem', cursor: 'pointer',
};
