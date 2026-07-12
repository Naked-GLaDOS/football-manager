import { useEffect, useState } from 'react';
import { SessionProvider, useSession } from './lib/session';
import Login from './pages/Login';
import Layout, { type View } from './components/Layout';
import Roster from './pages/Roster';
import Genitori from './pages/Genitori';
import Matches from './pages/Matches';
import Impostazioni from './pages/Impostazioni';
import Cms from './pages/Cms';

function Shell() {
  const s = useSession();
  const [view, setView] = useState<View>('players');

  // Admins live in the CMS; regular users in the roster views. Keep the active
  // view consistent with the account type.
  useEffect(() => {
    if (!s.authed) return;
    if (s.isAdmin && view !== 'cms') setView('cms');
    if (!s.isAdmin && view === 'cms') setView('players');
  }, [s.authed, s.isAdmin, view]);

  if (!s.ready) return <div className="spinner-page">…</div>;
  if (!s.authed) return <Login />;

  return (
    <Layout view={view} setView={setView}>
      {view === 'players' && <Roster kind="players" />}
      {view === 'staff' && <Roster kind="staff" />}
      {view === 'genitori' && <Genitori />}
      {view === 'matches' && <Matches />}
      {view === 'settings' && <Impostazioni />}
      {view === 'cms' && <Cms />}
    </Layout>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  );
}
