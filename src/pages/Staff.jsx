import { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Card, Stack, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Alert, Chip, IconButton, Tooltip, Snackbar,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/PersonAdd";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { supabase, invokeFn } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const ROLE_LABEL = { super_admin: "Super Admin", admin: "Admin", lower_admin: "Delivery" };
const ROLE_COLOR = { super_admin: "error", admin: "primary", lower_admin: "secondary" };

export default function Staff() {
  const { isSuperAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role, created_at")
      .in("role", ["super_admin", "admin", "lower_admin"])
      .order("created_at", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function offboard(id, name) {
    if (!confirm(`Remove ${name}?`)) return;
    try { await invokeFn("offboard-user", { target_id: id }); setToast("Removed"); load(); }
    catch (e) { alert(e.message); }
  }

  const columns = useMemo(() => [
    { field: "full_name", headerName: "Name", flex: 1, minWidth: 150 },
    { field: "phone", headerName: "Phone", width: 140 },
    {
      field: "role", headerName: "Role", width: 150,
      renderCell: (p) => <Chip size="small" color={ROLE_COLOR[p.value]} label={ROLE_LABEL[p.value]} />,
    },
    {
      field: "actions", headerName: "", width: 70, sortable: false, filterable: false,
      renderCell: (p) => p.row.role !== "super_admin" && (
        <Tooltip title="Offboard">
          <IconButton size="small" color="error" onClick={() => offboard(p.row.id, p.row.full_name)}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ], []);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">Staff</Typography>
          <Typography variant="body2" color="text.secondary">Admins and delivery staff.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>Add staff</Button>
      </Stack>

      <Card>
        <DataGrid autoHeight rows={rows} columns={columns} loading={loading} disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 25]}
          sx={{ border: 0, "& .MuiDataGrid-columnHeaders": { bgcolor: "#f6f9fa" } }} />
      </Card>

      <AddStaffDialog open={addOpen} onClose={() => setAddOpen(false)} isSuperAdmin={isSuperAdmin}
        onDone={() => { setAddOpen(false); setToast("Staff added"); load(); }} />

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}

function AddStaffDialog({ open, onClose, isSuperAdmin, onDone }) {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", role: "lower_admin" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pwd, setPwd] = useState("");

  useEffect(() => { if (open) { setErr(""); setPwd(""); setForm({ full_name: "", email: "", phone: "", role: "lower_admin" }); } }, [open]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setErr(""); setBusy(true);
    try {
      const res = await invokeFn("onboard-staff", {
        full_name: form.full_name, email: form.email, phone: form.phone, role: form.role,
      });
      setPwd(res.default_password);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add staff member</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        {pwd ? (
          <Alert severity="success">Created. Temporary password: <b>{pwd}</b></Alert>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Full name" required value={form.full_name} onChange={set("full_name")} />
            <TextField label="Email" type="email" required value={form.email} onChange={set("email")} />
            <TextField label="Phone" value={form.phone} onChange={set("phone")} />
            <TextField select label="Role" value={form.role} onChange={set("role")}>
              <MenuItem value="lower_admin">Delivery staff</MenuItem>
              {isSuperAdmin && <MenuItem value="admin">Admin</MenuItem>}
            </TextField>
            {!isSuperAdmin && (
              <Typography variant="caption" color="text.secondary">
                Only a Super Admin can create Admins.
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {pwd ? <Button variant="contained" onClick={onDone}>Done</Button> : (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" onClick={submit} disabled={busy || !form.full_name || !form.email}>
              {busy ? "Creating…" : "Create"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
