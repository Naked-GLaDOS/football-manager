import { createContext, useCallback, useContext, useState } from 'react';

// Lightweight in-app navigation for full-page detail views (single player, single
// match) layered over the tab-based views — no router dependency. A `detail` of
// null means the active tab's list/page is shown.
export type Detail = { type: 'player'; id: string } | { type: 'match'; id: string } | null;

interface NavState {
  detail: Detail;
  open: (detail: NonNullable<Detail>) => void;
  close: () => void;
}

const Ctx = createContext<NavState | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [detail, setDetail] = useState<Detail>(null);
  const open = useCallback((d: NonNullable<Detail>) => setDetail(d), []);
  const close = useCallback(() => setDetail(null), []);
  return <Ctx.Provider value={{ detail, open, close }}>{children}</Ctx.Provider>;
}

export function useNav(): NavState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}
