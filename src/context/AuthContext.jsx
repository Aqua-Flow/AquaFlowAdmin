import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId) {
    if (!userId) return setProfile(null);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role, branch_id, tenant_id, phone")
      .eq("id", userId)
      .single();
    setProfile(data ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user?.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      await loadProfile(s?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const signOut = () => supabase.auth.signOut();

  const isPlatformAdmin = profile?.role === "platform_admin";
  const isStaff = profile && ["super_admin", "admin", "lower_admin"].includes(profile.role);
  const isAdmin = profile && ["super_admin", "admin"].includes(profile.role);
  const isSuperAdmin = profile?.role === "super_admin";

  return (
    <AuthCtx.Provider
      value={{ session, profile, loading, signIn, signOut, isStaff, isAdmin, isSuperAdmin, isPlatformAdmin }}
    >
      {children}
    </AuthCtx.Provider>
  );
}
