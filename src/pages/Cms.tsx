import { useCallback, useEffect, useState } from 'react';
import { api, type AdminTeam, type AdminUser } from '../lib/api';
import { useSession } from '../lib/session';
import { c, card, btn, btnGhost, btnDanger, input as inputStyle, label as lblStyle } from '../lib/ui';

export default function Cms() {
  const { t } = useSession();
  const [tab, setTab] = useState<'teams' | 'users'>('teams');
  return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button style={tabBtn(tab === 'teams')} onClick={() => setTab('teams')}>{t('manageTeams')}</button>
        <button style={tabBtn(tab === 'users')} onClick={() => setTab('users')}>{t('manageUsers')}</button>
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
    await api.createTeam(name.trim());
    setName('');
    await load();
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
      <form onSubmit={create} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input style={inputStyle} placeholder={t('newTeam')} value={name} onChange={(e) => setName(e.target.value)} />
        <button style={btn} type="submit">{t('create')}</button>
      </form>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {teams.map((tm) => (
          <div key={tm.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{tm.name}</div>
              <div style={{ color: c.muted, fontSize: '0.8rem' }}>
                {tm.memberships.map((m) => m.user.email).join(', ') || '—'}
              </div>
            </div>
            <button style={btnGhost} onClick={() => rename(tm.id, tm.name)}>{t('edit')}</button>
            <button style={btnDanger} onClick={() => remove(tm.id)}>{t('delete')}</button>
          </div>
        ))}
      </div>
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
      <button style={{ ...btn, marginBottom: '1rem' }} onClick={() => setEditing('new')}>+ {t('newUser')}</button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {users.map((u) => (
          <div key={u.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{u.email} {u.role === 'ADMIN' && <span style={badge}>ADMIN</span>}</div>
              <div style={{ color: c.muted, fontSize: '0.8rem' }}>
                {teams.filter((tm) => u.teamIds.includes(tm.id)).map((tm) => tm.name).join(', ') || '—'}
              </div>
            </div>
            <button style={btnGhost} onClick={() => setEditing(u)}>{t('edit')}</button>
            {u.role !== 'ADMIN' && <button style={btnDanger} onClick={() => remove(u)}>{t('delete')}</button>}
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
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (user) {
        await api.updateUser(user.id, {
          email: email.trim(),
          password: password.trim() || undefined,
          teamIds,
        });
      } else {
        await api.createUser(email.trim(), password.trim(), teamIds);
      }
      await onSaved();
    } catch (err: any) {
      setError(err.message || 'Error'); setSaving(false);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <form style={{ background: c.card, borderRadius: '1rem', padding: '1.5rem', maxWidth: '26rem', width: '100%' }}
        onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3 style={{ marginTop: 0 }}>{user ? t('edit') : t('newUser')}</h3>

        <label style={lblStyle}>{t('email')}</label>
        <input style={inputStyle} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />

        <label style={{ ...lblStyle, marginTop: '0.75rem' }}>
          {user ? t('changePassword') : t('initialPassword')}
        </label>
        <input style={inputStyle} type="text" autoComplete="off" value={password}
          required={!user} minLength={8} onChange={(e) => setPassword(e.target.value)} />

        <label style={{ ...lblStyle, marginTop: '0.75rem' }}>{t('assignedTeams')}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {teams.map((tm) => (
            <button type="button" key={tm.id} onClick={() => toggle(tm.id)}
              style={teamIds.includes(tm.id) ? chipOn : chipOff}>
              {tm.name}
            </button>
          ))}
        </div>

        {error && <p style={{ color: c.danger, fontSize: '0.85rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" style={btnGhost} onClick={onClose}>{t('cancel')}</button>
          <button type="submit" style={btn} disabled={saving}>{saving ? t('loading') : t('save')}</button>
        </div>
      </form>
    </div>
  );
}

const tabBtn = (active: boolean): React.CSSProperties => ({
  background: active ? c.green : 'transparent', color: active ? '#fff' : c.muted,
  border: `1px solid ${active ? c.green : c.border}`, borderRadius: '0.5rem',
  padding: '0.45rem 0.9rem', fontSize: '0.9rem', cursor: 'pointer',
});
const badge: React.CSSProperties = {
  background: c.greenDim, color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.4rem',
  borderRadius: '0.4rem', marginLeft: '0.4rem', verticalAlign: 'middle',
};
const chipOn: React.CSSProperties = {
  background: c.green, color: '#fff', border: 'none', borderRadius: '1rem',
  padding: '0.3rem 0.7rem', fontSize: '0.85rem', cursor: 'pointer',
};
const chipOff: React.CSSProperties = {
  background: 'transparent', color: c.muted, border: `1px solid ${c.border}`, borderRadius: '1rem',
  padding: '0.3rem 0.7rem', fontSize: '0.85rem', cursor: 'pointer',
};
