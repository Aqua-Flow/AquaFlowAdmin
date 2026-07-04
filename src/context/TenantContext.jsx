import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

const TenantCtx = createContext(null);
export const useTenant = () => useContext(TenantCtx);

export function TenantProvider({ children }) {
  const { profile, isPlatformAdmin, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [tenantName, setTenantName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPlatformAdmin) {
      const selected = tenants.find((t) => t.id === tenantId);
      setTenantName(selected?.name ?? "AquaFlow Platform");
      return;
    }
    if (!profile?.tenant_id) return;
    supabase
      .from("tenants")
      .select("name")
      .eq("id", profile.tenant_id)
      .single()
      .then(({ data }) => setTenantName(data?.name ?? "AquaFlow"));
  }, [tenantId, tenants, profile?.tenant_id, isPlatformAdmin]);

  useEffect(() => {
    if (authLoading) return;
    if (!isPlatformAdmin) {
      setTenants([]);
      setTenantId(null);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("tenants")
        .select("id, name, active")
        .order("name");
      const t = data ?? [];
      setTenants(t);
      if (t.length > 0) setTenantId(t[0].id);
      setLoading(false);
    })();
  }, [isPlatformAdmin, authLoading]);

  return (
    <TenantCtx.Provider value={{ tenantId, setTenantId, tenants, loading, tenantName }}>
      {children}
    </TenantCtx.Provider>
  );
}