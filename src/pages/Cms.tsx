import { useCallback, useEffect, useState } from 'react';
import { api, type AdminTeam, type AdminUser } from '../lib/api';
import { useSession } from '../lib/session';
import { IconPlus, IconEdit } from '../components/Icons';

export default function Cms() {
  const { t } = useSession();
  const [tab, setTab] = useState<'teams' | 'users'>('teams');
  return (
    <div>
      <div className="section-head">
        <h2 className="title">{t('cms')}</h2>
        <div className="segmented">
          <button className={tab === 'teams' ? 'active' : ''} onClick={() => setTab('teams')}>{t('manageTeams')}</button>
          <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>{t('manageUsers')}</button>
        </div>
      </div>
      {tab === 'teams' ? <Teams /> : <Users />}
    </div>
  );
}

function Teams() {
  const { t } = useSession();
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [name, setName] = useState('');

  const load = useCallback(async () => setTeams(await api.adminTeams()), []);
  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.createTeam(name.trim()); setName(''); await load();
  };
  const rename = async (id: string, current: string) => {
    const next = prompt(t('teamName'), current);
    if (next && next.trim()) { await api.updateTeam(id, next.trim()); await load(); }
  };
  const remove = async (id: string) => {
    if (confirm(t('confirmDelete'))) { await api.deleteTeam(id); await load(); }
  };

  return (
    <div>
      <form onSubmit={create} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.1rem' }}>
        <input className="input" placeholder={t('newTeam')} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary" type="submit"><IconPlus /> {t('create')}</button>
      </form>
      {teams.length === 0 ? <p className="empty">{t('empty')}</p> : (
        <div className="stack">
          {teams.map((tm) => (
            <div key={tm.id} className="card row">
              <div className="row-main">
                <div className="row-title">{tm.name}</div>
                <div className="row-sub">{tm.memberships.map((m) => m.user.email).join(', ') || '—'}</div>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => rename(tm.id, tm.name)}><IconEdit /></button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(tm.id)}>{t('delete')}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Users() {
  const { t } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);

  const load = useCallback(async () => {
    const [u, tm] = await Promise.all([api.adminUsers(), api.adminTeams()]);
    setUsers(u); setTeams(tm);
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (u: AdminUser) => {
    if (confirm(t('confirmDelete'))) { await api.deleteUser(u.id); await load(); }
  };

  return (
    <div>
      <button className="btn btn-primary" style={{ marginBottom: '1.1rem' }} onClick={() => setEditing('new')}>
        <IconPlus /> {t('newUser')}
      </button>
      <div className="stack">
        {users.map((u) => (
          <div key={u.id} className="card row">
            <div className="row-main">
              <div className="row-title">{u.email} {u.role === 'ADMIN' && <span className="badge">ADMIN</span>}</div>
              <div className="row-sub">
                {teams.filter((tm) => u.teamIds.includes(tm.id)).map((tm) => tm.name).join(', ') || '—'}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(u)}><IconEdit /></button>
            {u.role !== 'ADMIN' && <button className="btn btn-danger btn-sm" onClick={() => remove(u)}>{t('delete')}</button>}
          </div>
        ))}
      </div>

      {editing && (
        <UserEditor user={editing === 'new' ? null : editing} teams={teams}
          onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load(); }} />
      )}
    </div>
  );
}

function UserEditor({ user, teams, onClose, onSaved }: {
  user: AdminUser | null; teams: AdminTeam[]; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const { t } = useSession();
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [teamIds, setTeamIds] = useState<string[]>(user?.teamIds ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (id: string) =>
    setTeamIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (user) await api.updateUser(user.id, { email: email.trim(), password: password.trim() || undefined, teamIds });
      else await api.createUser(email.trim(), password.trim(), teamIds);
      await onSaved();
    } catch (err: any) { setError(err.message || 'Error'); setSaving(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" style={{ maxWidth: '26rem' }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="sheet-grip" />
        <h3 className="title" style={{ marginBottom: '1rem' }}>{user ? t('edit') : t('newUser')}</h3>

        <div className="stack">
          <div className="field">
            <label>{t('email')}</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>{user ? t('changePassword') : t('initialPassword')}</label>
            <input className="input" type="text" autoComplete="off" value={password}
              required={!user} minLength={8} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="field">
            <label>{t('assignedTeams')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {teams.length === 0 && <span className="muted" style={{ fontSize: '0.85rem' }}>—</span>}
              {teams.map((tm) => (
                <button type="button" key={tm.id} className={`chip${teamIds.includes(tm.id) ? ' on' : ''}`}
                  onClick={() => toggle(tm.id)}>{tm.name}</button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('loading') : t('save')}</button>
        </div>
      </form>
    </div>
  );
}
