import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

const TenantCtx = createContext(null);
export const useTenant = () => useContext(TenantCtx);

export function TenantProvider({ children }) {
  const { isPlatformAdmin, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <TenantCtx.Provider value={{ tenantId, setTenantId, tenants, loading }}>
      {children}
    </TenantCtx.Provider>
  );
}