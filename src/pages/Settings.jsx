import { useEffect, useState } from "react";
import {
  Box, Typography, Card, CardContent, Stack, TextField, Button, Divider, Snackbar,
  Grid, Chip,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";

export default function Settings() {
  const { profile, isPlatformAdmin } = useAuth();
  const { tenantId } = useTenant();
  const [branch, setBranch] = useState(null);
  const [plans, setPlans] = useState([]);
  const [toast, setToast] = useState("");

  async function load() {
    if (isPlatformAdmin) {
      if (!tenantId) return;
      const { data, error } = await supabase.rpc("get_tenant_settings", {
        p_tenant_id: tenantId,
      });
      if (error) { console.error(error); return; }
      setBranch(data?.branch ?? null);
      setPlans(data?.plans ?? []);
    } else {
      if (!profile?.branch_id) return;
      const { data: b } = await supabase
        .from("branches").select("*").eq("id", profile.branch_id).single();
      setBranch(b);
      const { data: p } = await supabase
        .from("plans").select("*").eq("branch_id", profile.branch_id);
      setPlans(p ?? []);
    }
  }
  useEffect(() => { load(); }, [profile?.branch_id, tenantId, isPlatformAdmin]);

  async function save() {
    const { id, name, address, phone, upi_id, upi_name } = branch;
    const { error } = await supabase.from("branches")
      .update({ name, address, phone, upi_id, upi_name }).eq("id", id);
    setToast(error ? error.message : "Saved");
  }

  if (!branch) return <Typography color="text.secondary">Loading branch…</Typography>;
  const set = (k) => (e) => setBranch({ ...branch, [k]: e.target.value });
  const readOnly = isPlatformAdmin;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Settings</Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Branch / plant</Typography>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField label="Name" value={branch.name ?? ""} onChange={set("name")} disabled={readOnly} />
                <TextField label="Address" value={branch.address ?? ""} onChange={set("address")} multiline minRows={2} disabled={readOnly} />
                <TextField label="Phone" value={branch.phone ?? ""} onChange={set("phone")} disabled={readOnly} />
                <Divider textAlign="left"><Chip label="UPI collection" size="small" /></Divider>
                <TextField label="UPI ID (VPA)" value={branch.upi_id ?? ""} onChange={set("upi_id")}
                  placeholder="yourbusiness@okhdfcbank"
                  helperText="Used to generate payment QR codes across the app" disabled={readOnly} />
                <TextField label="Payee display name" value={branch.upi_name ?? ""} onChange={set("upi_name")} disabled={readOnly} />
                {!readOnly && (
                  <Box>
                    <Button variant="contained" startIcon={<SaveIcon />} onClick={save}>Save changes</Button>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Subscription plans</Typography>
              <Stack divider={<Divider flexItem />} spacing={1} sx={{ mt: 1 }}>
                {plans.length === 0 && <Typography color="text.secondary" variant="body2">No plans yet.</Typography>}
                {plans.map((p) => (
                  <Stack key={p.id} direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.jars_per_delivery} jar/delivery · {p.frequency}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={700}>₹{p.price}/{p.price_period}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}
