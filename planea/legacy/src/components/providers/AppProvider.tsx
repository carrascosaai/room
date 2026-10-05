"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getBackend, type Backend } from "@/lib/backend";
import { EMPTY_STATE, type MyState } from "@/lib/backend/types";
import type { XpReason } from "@/lib/gamification";
import type { Profile } from "@/lib/types";
import { AuthSheet } from "@/components/auth/AuthSheet";
import { Toaster, type Toast } from "@/components/ui/Toaster";

interface AppContextValue {
  backend: Backend;
  profile: Profile | null;
  ready: boolean;
  my: MyState;
  /** Estado del usuario en el momento de cargar (para no contarle dos veces). */
  baseline: MyState;
  setMy: (fn: (s: MyState) => MyState) => void;
  refreshProfile: () => Promise<void>;
  /** Vuelve a cargar perfil y estado personal (tras acciones con efectos en servidor). */
  reload: () => Promise<void>;
  /** Ejecuta la acción si hay sesión; si no, abre el registro con un motivo. */
  requireAuth: (reason: string, action?: () => void) => boolean;
  toast: (t: Omit<Toast, "id">) => void;
  xp: (reason: XpReason) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const backend = useMemo(() => getBackend(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [my, setMyState] = useState<MyState>(EMPTY_STATE);
  const [baseline, setBaseline] = useState<MyState>(EMPTY_STATE);
  const [authReason, setAuthReason] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pending = useRef<(() => void) | null>(null);

  const load = useCallback(async () => {
    const p = await backend.getProfile();
    setProfile(p);
    const state = p ? await backend.loadMyState() : EMPTY_STATE;
    setMyState(state);
    setBaseline(backend.countsIncludeSelf ? state : EMPTY_STATE);
    setReady(true);
    if (p && pending.current) {
      const fn = pending.current;
      pending.current = null;
      fn();
    }
  }, [backend]);

  useEffect(() => {
    // Sincroniza con un sistema externo (sesión): la carga es asíncrona.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return backend.onAuthChange(() => void load());
  }, [backend, load]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), t.tone === "error" ? 4500 : 2600);
  }, []);

  const requireAuth = useCallback(
    (reason: string, action?: () => void) => {
      if (profile) return true;
      pending.current = action ?? null;
      setAuthReason(reason);
      return false;
    },
    [profile],
  );

  const refreshProfile = useCallback(async () => {
    setProfile(await backend.getProfile());
  }, [backend]);

  const profileRef = useRef<Profile | null>(null);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  /** Refresca el perfil y celebra el XP solo si de verdad ha subido (el XP se da una vez por acción). */
  const xp = useCallback(
    (_reason: XpReason) => {
      const before = profileRef.current?.xp ?? 0;
      void backend.getProfile().then((p) => {
        setProfile(p);
        if (p && p.xp > before) toast({ message: `+${p.xp - before} XP`, tone: "xp" });
      });
    },
    [backend, toast],
  );

  const value = useMemo<AppContextValue>(
    () => ({ backend, profile, ready, my, baseline, setMy: setMyState, refreshProfile, reload: load, requireAuth, toast, xp }),
    [backend, profile, ready, my, baseline, refreshProfile, load, requireAuth, toast, xp],
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <AuthSheet
        reason={authReason}
        onClose={() => {
          setAuthReason(null);
          pending.current = null;
        }}
        onDone={() => setAuthReason(null)}
      />
      <Toaster toasts={toasts} />
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp fuera de AppProvider");
  return ctx;
}
