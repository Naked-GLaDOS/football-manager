import { useEffect, useState } from 'react';
import { SessionProvider, useSession } from './lib/session';
import Login from './pages/Login';
import Layout, { type View } from './components/Layout';
import Roster from './pages/Roster';
import Genitori from './pages/Genitori';
import Cms from './pages/Cms';
import { c } from './lib/ui';

function Shell() {
  const s = useSession();
  const [view, setView] = useState<View>('players');

  // Admins with no team assignments land on the CMS.
  useEffect(() => {
    if (s.authed && s.isAdmin && s.me && s.me.teams.length === 0) setView('cms');
  }, [s.authed, s.isAdmin, s.me]);

  // Non-admins can't stay on the CMS view.
  useEffect(() => {
    if (!s.isAdmin && view === 'cms') setView('players');
  }, [s.isAdmin, view]);

  if (!s.ready) {
    return <div style={{ minHeight: '100dvh', background: c.bg, color: c.muted, display: 'grid', placeItems: 'center' }}>…</div>;
  }
  if (!s.authed) return <Login />;

  return (
    <Layout view={view} setView={setView}>
      {view === 'players' && <Roster kind="players" />}
      {view === 'staff' && <Roster kind="staff" />}
      {view === 'genitori' && <Genitori />}
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
