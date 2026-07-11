import { useSession } from '../lib/session';
import type { TKey } from '../lib/i18n';
import { c, container } from '../lib/ui';

export type View = 'players' | 'staff' | 'genitori' | 'cms';

const NAV: { view: View; key: TKey; adminOnly?: boolean }[] = [
  { view: 'players', key: 'players' },
  { view: 'staff', key: 'staff' },
  { view: 'genitori', key: 'parents' },
  { view: 'cms', key: 'cms', adminOnly: true },
];

export default function Layout({
  view, setView, children,
}: { view: View; setView: (v: View) => void; children: React.ReactNode }) {
  const s = useSession();
  const { t } = s;

  return (
    <div style={{ minHeight: '100dvh', background: c.bg, color: c.text }}>
      <header style={bar}>
        <div style={{ ...container, display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
          <strong style={{ color: c.green, fontSize: '1.05rem', marginRight: '0.5rem' }}>{t('appName')}</strong>

          {/* Team switcher (hidden on CMS view / when no teams) */}
          {view !== 'cms' && s.me && s.me.teams.length > 0 && (
            <select value={s.teamId ?? ''} onChange={(e) => s.setTeam(e.target.value)} style={select} aria-label={t('team')}>
              {s.me.teams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
            </select>
          )}

          {/* Season switcher */}
          {view !== 'cms' && (
            <select value={s.seasonId ?? ''} onChange={(e) => s.setSeason(e.target.value)} style={select} aria-label={t('season')}>
              {s.seasons.map((se) => (
                <option key={se.id} value={se.id}>{se.name}{se.editable ? '' : ' 🔒'}</option>
              ))}
            </select>
          )}

          <div style={{ flex: 1 }} />

          <button onClick={() => s.setLang(s.lang === 'it' ? 'en' : 'it')} style={iconBtn} title={t('language')}>
            {s.lang === 'it' ? '🇮🇹' : '🇬🇧'}
          </button>
          <button onClick={s.logout} style={iconBtn}>{t('signOut')}</button>
        </div>

        <nav style={{ ...container, display: 'flex', gap: '0.4rem', paddingTop: 0, overflowX: 'auto' }}>
          {NAV.filter((n) => !n.adminOnly || s.isAdmin).map((n) => (
            <button key={n.view} onClick={() => setView(n.view)} style={tab(view === n.view)}>
              {t(n.key)}
            </button>
          ))}
        </nav>
      </header>

      {view !== 'cms' && !s.editable && (
        <div style={lockedBanner}>🔒 {t('seasonLocked')}</div>
      )}

      <main style={container}>{children}</main>
    </div>
  );
}

const bar: React.CSSProperties = {
  background: c.card, borderBottom: `1px solid ${c.border}`, position: 'sticky', top: 0, zIndex: 20,
};
const select: React.CSSProperties = {
  background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: '0.5rem',
  padding: '0.35rem 0.5rem', fontSize: '0.9rem',
};
const iconBtn: React.CSSProperties = {
  background: 'transparent', color: c.muted, border: `1px solid ${c.border}`, borderRadius: '0.5rem',
  padding: '0.35rem 0.6rem', fontSize: '0.85rem', cursor: 'pointer',
};
const tab = (active: boolean): React.CSSProperties => ({
  background: 'transparent', border: 'none', borderBottom: `2px solid ${active ? c.green : 'transparent'}`,
  color: active ? c.text : c.muted, fontWeight: active ? 600 : 400,
  padding: '0.6rem 0.4rem', fontSize: '0.95rem', cursor: 'pointer', whiteSpace: 'nowrap',
});
const lockedBanner: React.CSSProperties = {
  background: '#78350f', color: '#fed7aa', textAlign: 'center', padding: '0.4rem', fontSize: '0.85rem',
};
