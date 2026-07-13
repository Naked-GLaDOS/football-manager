import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, type Me, type Season, type Theme } from './api';
import { translator, type Lang, type TKey } from './i18n';

interface SessionState {
  ready: boolean;
  authed: boolean;
  me: Me | null;
  isAdmin: boolean;
  seasons: Season[];
  teamId: string | null;
  seasonId: string | null;
  season: Season | null;
  editable: boolean;
  lang: Lang;
  theme: Theme;
  t: (k: TKey) => string;
  setTeam: (id: string) => void;
  setSeason: (id: string) => void;
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  onLogin: () => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<SessionState | null>(null);

const LS = {
  team: 'fm_team',
  season: 'fm_season',
  lang: 'fm_lang',
  theme: 'fm_theme',
};

const applyTheme = (theme: Theme) => { document.documentElement.dataset.theme = theme; };

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teamId, setTeamId] = useState<string | null>(localStorage.getItem(LS.team));
  const [seasonId, setSeasonId] = useState<string | null>(localStorage.getItem(LS.season));
  const [lang, setLangState] = useState<Lang>((localStorage.getItem(LS.lang) as Lang) || 'it');
  const [theme, setThemeState] = useState<Theme>((localStorage.getItem(LS.theme) as Theme) || 'dark');

  const load = useCallback(async () => {
    if (!localStorage.getItem('fm_token')) {
      setMe(null);
      setReady(true);
      return;
    }
    try {
      const [meData, seasonData, account] = await Promise.all([api.me(), api.seasons(), api.account()]);
      setMe(meData);
      setSeasons(seasonData.seasons);

      // Server preferences win, so theme/language follow the user across devices.
      setLangState(account.lang);
      localStorage.setItem(LS.lang, account.lang);
      setThemeState(account.theme);
      localStorage.setItem(LS.theme, account.theme);

      // Pick sensible defaults if none stored / stored value is now invalid.
      setTeamId((prev) =>
        prev && meData.teams.some((tm) => tm.id === prev) ? prev : (meData.teams[0]?.id ?? null),
      );
      setSeasonId((prev) =>
        prev && seasonData.seasons.some((s) => s.id === prev) ? prev : seasonData.currentSeasonId,
      );
    } catch {
      localStorage.removeItem('fm_token');
      setMe(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Keep the <html data-theme> attribute in sync with the active theme.
  useEffect(() => { applyTheme(theme); }, [theme]);

  useEffect(() => {
    const onUnauth = () => { setMe(null); };
    window.addEventListener('fm-unauthorized', onUnauth);
    return () => window.removeEventListener('fm-unauthorized', onUnauth);
  }, []);

  useEffect(() => { if (teamId) localStorage.setItem(LS.team, teamId); }, [teamId]);
  useEffect(() => { if (seasonId) localStorage.setItem(LS.season, seasonId); }, [seasonId]);

  // Persist preference changes locally and, when signed in, to the account so
  // they sync across devices (fire-and-forget — the UI already updated).
  const authed = !!me;
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(LS.lang, l);
    if (localStorage.getItem('fm_token')) api.updateAccount({ lang: l }).catch(() => {});
  };
  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem(LS.theme, t);
    if (localStorage.getItem('fm_token')) api.updateAccount({ theme: t }).catch(() => {});
  };

  const logout = () => {
    // Best-effort server-side revoke of the current session before clearing.
    if (localStorage.getItem('fm_token')) api.logout().catch(() => {});
    localStorage.removeItem('fm_token');
    setMe(null);
    setSeasons([]);
  };

  const season = seasons.find((s) => s.id === seasonId) ?? null;

  const value: SessionState = {
    ready,
    authed,
    me,
    isAdmin: me?.role === 'ADMIN',
    seasons,
    teamId,
    seasonId,
    season,
    editable: season?.editable ?? false,
    lang,
    theme,
    t: translator(lang),
    setTeam: setTeamId,
    setSeason: setSeasonId,
    setLang,
    setTheme,
    onLogin: load,
    logout,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
