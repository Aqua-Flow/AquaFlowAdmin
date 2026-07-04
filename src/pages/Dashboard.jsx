import { useEffect, useState } from "react";
import {
  Grid, Typography, Card, CardContent, Box, Chip, Stack, Divider, Skeleton,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import StatCard from "../components/StatCard";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";

const reconColor = { matched: "success", mismatch: "warning", unconfirmed: "default", disputed: "error" };

export default function Dashboard() {
  const { isPlatformAdmin } = useAuth();
  const { tenantId } = useTenant();
  const [stats, setStats] = useState(null);
  const [recon, setRecon] = useState([]);
  const [loading, setLoading] = useState(true);

  function addTenantFilter(query, isPlatformAdmin, tenantId) {
    return isPlatformAdmin && tenantId ? query.eq("tenant_id", tenantId) : query;
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_dashboard_stats", { p_tenant_id: tenantId });
      setStats(data);

      const today = new Date().toISOString().slice(0, 10);
      let q = supabase
        .from("reconciliation")
        .select("customer_id, day, jars_delivered, jars_confirmed, status")
        .eq("day", today)
        .in("status", ["mismatch", "disputed"])
        .limit(8);
      q = addTenantFilter(q, isPlatformAdmin, tenantId);
      const { data: r } = await q;

      // hydrate names
      let rows = r ?? [];
      if (rows.length) {
        const ids = [...new Set(rows.map((x) => x.customer_id))];
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        const nameById = Object.fromEntries((profs ?? []).map((p) => [p.id, p.full_name]));
        rows = rows.map((x) => ({ ...x, name: nameById[x.customer_id] ?? "—" }));
      }
      setRecon(rows);
      setLoading(false);
    })();
  }, [tenantId]);

  const s = stats ?? {};

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Overview</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Today at a glance across your RO operation.
      </Typography>

      <Grid container spacing={2}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))
        ) : (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard label="Total customers" value={s.total_customers ?? 0}
                icon={<PeopleIcon />} hint={`${s.active_customers ?? 0} active`} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard label="Deliveries today" value={s.deliveries_today ?? 0}
                tone="secondary" icon={<LocalShippingIcon />} hint={`${s.jars_today ?? 0} jars out`} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard label="Jars today" value={s.jars_today ?? 0}
                tone="primary" icon={<WaterDropIcon />} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard label="Pending requests" value={s.pending_requests ?? 0}
                tone="warning" icon={<SupportAgentIcon />} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard label="Discrepancies today" value={s.discrepancies_today ?? 0}
                tone="error" icon={<ReportProblemIcon />} hint="Needs review" />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard label="Revenue this month" value={`₹${Number(s.revenue_month ?? 0).toLocaleString("en-IN")}`}
                tone="success" icon={<CurrencyRupeeIcon />} />
            </Grid>
          </>
        )}
      </Grid>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="h6">Today's discrepancies</Typography>
            <Chip size="small" label="delivery vs customer check-in" variant="outlined" />
          </Stack>
          <Divider sx={{ mb: 1 }} />
          {loading ? (
            <Skeleton variant="rounded" height={80} />
          ) : recon.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              Everything reconciles so far today. 🎉
            </Typography>
          ) : (
            <Stack divider={<Divider flexItem />} spacing={1}>
              {recon.map((r, i) => (
                <Stack key={i} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.5 }}>
                  <Typography variant="body2" fontWeight={600}>{r.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    staff: {r.jars_delivered ?? "—"} · customer: {r.jars_confirmed ?? "—"}
                  </Typography>
                  <Chip size="small" color={reconColor[r.status]} label={r.status}
                    sx={{ textTransform: "capitalize" }} />
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
