import { useSession } from '../lib/session';
import type { TKey } from '../lib/i18n';
import { IconPlayers, IconStaff, IconParents, IconMatches, IconAdmin, IconSettings, IconGlobe, IconLogout } from './Icons';

export type View = 'players' | 'staff' | 'genitori' | 'matches' | 'settings' | 'cms';

const NAV: { view: View; key: TKey; Icon: React.FC<{ size?: number }>; adminOnly?: boolean }[] = [
  { view: 'players', key: 'players', Icon: IconPlayers },
  { view: 'staff', key: 'staff', Icon: IconStaff },
  { view: 'genitori', key: 'parents', Icon: IconParents },
  { view: 'matches', key: 'matches', Icon: IconMatches },
  { view: 'settings', key: 'settings', Icon: IconSettings },
  { view: 'cms', key: 'cms', Icon: IconAdmin, adminOnly: true },
];

export default function Layout({
  view, setView, children,
}: { view: View; setView: (v: View) => void; children: React.ReactNode }) {
  const s = useSession();
  const { t } = s;
  // Admins only get the CMS (teams + users). Regular users get the roster views.
  const items = NAV.filter((n) => (s.isAdmin ? n.view === 'cms' : n.view !== 'cms'));
  const showContext = view !== 'cms';

  return (
    <div className="app">
      <header className="appbar">
        <div className="appbar-row">
          <span className="brand">FM</span>

          {showContext && s.me && s.me.teams.length > 0 && (
            <select className="select compact" value={s.teamId ?? ''} aria-label={t('team')}
              onChange={(e) => s.setTeam(e.target.value)}>
              {s.me.teams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
            </select>
          )}

          {showContext && (
            <select className="select compact" value={s.seasonId ?? ''} aria-label={t('season')}
              onChange={(e) => s.setSeason(e.target.value)}>
              {s.seasons.map((se) => (
                <option key={se.id} value={se.id}>{se.name}{se.editable ? '' : ' 🔒'}</option>
              ))}
            </select>
          )}

          <span className="spacer" />

          <button className="btn btn-ghost btn-icon" title={t('language')}
            onClick={() => s.setLang(s.lang === 'it' ? 'en' : 'it')}>
            <IconGlobe /><span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{s.lang.toUpperCase()}</span>
          </button>
          <button className="btn btn-ghost btn-icon" title={t('signOut')} onClick={s.logout}>
            <IconLogout />
          </button>
        </div>

        <nav className="nav-desktop">
          {items.map((n) => (
            <button key={n.view} className={`nav-tab${view === n.view ? ' active' : ''}`} onClick={() => setView(n.view)}>
              {t(n.key)}
            </button>
          ))}
        </nav>
      </header>

      {showContext && !s.editable && (
        <div className="banner-locked">🔒 {t('seasonLocked')}</div>
      )}

      <main className="content">{children}</main>

      <nav className="tabbar">
        {items.map((n) => (
          <button key={n.view} className={view === n.view ? 'active' : ''} onClick={() => setView(n.view)}>
            <n.Icon size={22} />
            {t(n.key)}
          </button>
        ))}
      </nav>
    </div>
  );
}
