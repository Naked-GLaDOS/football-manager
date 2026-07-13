import { useCallback, useEffect, useState } from 'react';
import { SessionProvider, useSession } from './lib/session';
import { NavProvider, useNav } from './lib/nav';
import { NotificationProvider } from './lib/notifications';
import Login from './pages/Login';
import Layout, { type View } from './components/Layout';
import Roster from './pages/Roster';
import Genitori from './pages/Genitori';
import Matches from './pages/Matches';
import Impostazioni from './pages/Impostazioni';
import Cms from './pages/Cms';
import PlayerPage from './pages/PlayerPage';
import MatchPage from './pages/MatchPage';
import Account from './pages/Account';

function Shell() {
  const s = useSession();
  const nav = useNav();
  const [view, setViewState] = useState<View>('players');

  // Switching tabs always leaves any open detail page.
  const setView = (v: View) => { nav.close(); setViewState(v); };

  // Admins live in the CMS; regular users in the roster views. Keep the active
  // view consistent with the account type.
  useEffect(() => {
    if (!s.authed) return;
    if (s.isAdmin && view !== 'cms') setView('cms');
    if (!s.isAdmin && view === 'cms') setView('players');
  }, [s.authed, s.isAdmin, view]);

  const openMatch = useCallback((id: string) => nav.open({ type: 'match', id }), [nav]);

  if (!s.ready) return <div className="spinner-page">…</div>;
  if (!s.authed) return <Login />;

  return (
    <NotificationProvider onOpenMatch={openMatch}>
      <Layout view={view} setView={setView}>
        {nav.detail?.type === 'player' ? (
          <PlayerPage playerId={nav.detail.id} />
        ) : nav.detail?.type === 'match' ? (
          <MatchPage matchId={nav.detail.id} />
        ) : nav.detail?.type === 'account' ? (
          <Account />
        ) : (
          <>
            {view === 'players' && <Roster kind="players" />}
            {view === 'staff' && <Roster kind="staff" />}
            {view === 'genitori' && <Genitori />}
            {view === 'matches' && <Matches />}
            {view === 'settings' && <Impostazioni />}
            {view === 'cms' && <Cms />}
          </>
        )}
      </Layout>
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <NavProvider>
        <Shell />
      </NavProvider>
    </SessionProvider>
  );
}
