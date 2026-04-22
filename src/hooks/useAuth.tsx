import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "customer" | "lab" | "admin";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: Role[];
  rolesLoaded: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastUidRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function applySession(s: Session | null) {
      if (!mounted) return;
      setSession(s);
      const u = s?.user ?? null;
      setUser(u);
      const uid = u?.id ?? null;
      // Only refetch roles when the user identity actually changes.
      if (uid === lastUidRef.current) {
        return;
      }
      lastUidRef.current = uid;
      if (!uid) {
        setRoles([]);
        setRolesLoaded(true);
        return;
      }
      setRolesLoaded(false);
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (!mounted) return;
      setRoles((data ?? []).map((r) => r.role as Role));
      setRolesLoaded(true);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      void applySession(s);
    });

    supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        roles,
        rolesLoaded,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}

export function homeRouteFor(roles: Role[]): string {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("lab")) return "/lab";
  return "/portal";
}
