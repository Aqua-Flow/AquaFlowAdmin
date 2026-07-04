import { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Button, Card, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, Snackbar, Chip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddBusinessIcon from "@mui/icons-material/AddBusiness";
import dayjs from "dayjs";
import { supabase, invokeFn } from "../lib/supabase";

export default function Tenants() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("tenants")
      .select("id, name, contact_email, active, created_at")
      .order("created_at", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const columns = useMemo(() => [
    { field: "name", headerName: "Business", flex: 1, minWidth: 180 },
    { field: "contact_email", headerName: "Contact", flex: 1, minWidth: 180 },
    {
      field: "active", headerName: "Status", width: 110,
      renderCell: (p) => <Chip size="small" color={p.value ? "success" : "default"}
        label={p.value ? "Active" : "Suspended"} />,
    },
    { field: "created_at", headerName: "Created", width: 140,
      valueFormatter: (v) => dayjs(v).format("DD MMM YYYY") },
  ], []);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">Tenants</Typography>
          <Typography variant="body2" color="text.secondary">
            Each tenant is one RO business with its own super admin, staff and customers.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddBusinessIcon />} onClick={() => setAddOpen(true)}>
          Add tenant
        </Button>
      </Stack>

      <Card>
        <DataGrid autoHeight rows={rows} columns={columns} loading={loading} disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 25]}
          sx={{ border: 0, "& .MuiDataGrid-columnHeaders": { bgcolor: "#f6f9fa" } }} />
      </Card>

      <AddTenantDialog open={addOpen} onClose={() => setAddOpen(false)}
        onDone={() => { setAddOpen(false); setToast("Tenant created"); load(); }} />

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}

function AddTenantDialog({ open, onClose, onDone }) {
  const [form, setForm] = useState({
    tenant_name: "", contact_email: "", branch_name: "", admin_full_name: "", admin_email: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pwd, setPwd] = useState("");

  useEffect(() => {
    if (open) { setErr(""); setPwd("");
      setForm({ tenant_name: "", contact_email: "", branch_name: "", admin_full_name: "", admin_email: "" }); }
  }, [open]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setErr(""); setBusy(true);
    try {
      const res = await invokeFn("create-tenant", form);
      setPwd(res.default_password);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add tenant (RO business)</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        {pwd ? (
          <Alert severity="success">
            Tenant created with its first super admin.<br />
            Temporary password: <b>{pwd}</b> — share it so they can log in and change it.
          </Alert>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Business name" required value={form.tenant_name} onChange={set("tenant_name")} />
            <TextField label="Business contact email" value={form.contact_email} onChange={set("contact_email")} />
            <TextField label="First branch / plant name" value={form.branch_name} onChange={set("branch_name")}
              placeholder="Main Plant" />
            <Typography variant="subtitle2" color="text.secondary">Owner login (super admin)</Typography>
            <TextField label="Owner full name" required value={form.admin_full_name} onChange={set("admin_full_name")} />
            <TextField label="Owner email" type="email" required value={form.admin_email} onChange={set("admin_email")}
              helperText="Password will be firstname@1234" />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {pwd ? <Button variant="contained" onClick={onDone}>Done</Button> : (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" onClick={submit}
              disabled={busy || !form.tenant_name || !form.admin_full_name || !form.admin_email}>
              {busy ? "Creating…" : "Create tenant"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
