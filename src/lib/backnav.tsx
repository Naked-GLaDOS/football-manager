import { createContext, useContext, useEffect, useRef } from 'react';

// Hardware/browser Back button integration for a router-less app.
//
// Any dismissable UI "layer" (an open modal/sheet, a full-page detail view, a
// non-home tab) registers itself while it is open. Each registration pushes one
// browser history entry. Pressing Back pops the top layer and runs its close
// callback instead of leaving the app; only when nothing is registered does Back
// fall through to the browser (closing the PWA). Closing a layer from the UI
// (its own button) retracts the history entry it added.

type CloseFn = () => void;

interface BackStack {
  push: (close: CloseFn) => number;
  remove: (token: number) => void;
}

const Ctx = createContext<BackStack | null>(null);

export function BackNavProvider({ children }: { children: React.ReactNode }) {
  const stackRef = useRef<{ token: number; close: CloseFn }[]>([]);
  const counterRef = useRef(0);
  // Number of programmatic history.back() calls whose popstate we still need to
  // swallow. It's a counter, not a boolean, because several layers can be
  // retracted in the same tick (e.g. closing a detail view *and* switching tab):
  // each retraction fires its own popstate, and a boolean would only absorb the
  // first — the surplus events would step the browser out of the app.
  const ignoreRef = useRef(0);

  useEffect(() => {
    const onPop = () => {
      if (ignoreRef.current > 0) { ignoreRef.current -= 1; return; }
      const layer = stackRef.current.pop();
      if (layer) layer.close();
      // No layer left → the browser has already stepped back out of the app.
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const api = useRef<BackStack>({
    push: (close) => {
      const token = ++counterRef.current;
      stackRef.current.push({ token, close });
      window.history.pushState({ fmBack: token }, '');
      return token;
    },
    remove: (token) => {
      const st = stackRef.current;
      const idx = st.findIndex((l) => l.token === token);
      if (idx === -1) return; // already popped by a Back press
      const wasTop = idx === st.length - 1;
      st.splice(idx, 1);
      // Only retract history when removing the topmost entry (the common case:
      // layers close in LIFO order). Retracting for a non-top layer would pop the
      // wrong browser entry.
      if (wasTop) {
        ignoreRef.current += 1;
        window.history.back();
      }
    },
  }).current;

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

// Register a dismissable layer while `active` is true. `onClose` is invoked when
// the user presses Back with this layer on top.
export function useBackDismiss(active: boolean, onClose: CloseFn) {
  const back = useContext(Ctx);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!back || !active) return;
    const token = back.push(() => closeRef.current());
    return () => back.remove(token);
  }, [back, active]);
}
