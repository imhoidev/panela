import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  /** false até a primeira resposta de getSession() resolver no client. */
  ready: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [ready, setReady] = useState(false);

  async function loadProfileAndRoles(uid: string) {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile(p ?? null);
    setRoles((r ?? []).map((x) => x.role as AppRole));
  }

  useEffect(() => {
    // Listener primeiro (síncrono dentro do callback) — recomenda Supabase.
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // defer pra não rodar fetch dentro do callback
        setTimeout(() => loadProfileAndRoles(s.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });
    // Depois pega sessão atual
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadProfileAndRoles(data.session.user.id);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        user, session, profile, roles, ready,
        refreshProfile: async () => { if (user) await loadProfileAndRoles(user.id); },
        signOut: async () => { await supabase.auth.signOut(); },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const isStaff = (roles: AppRole[]) =>
  roles.some((r) => r === "admin" || r === "coo" || r === "ceo");
export const isCeo = (roles: AppRole[]) => roles.includes("ceo");
export const isCooOrAbove = (roles: AppRole[]) => roles.includes("ceo") || roles.includes("coo");
