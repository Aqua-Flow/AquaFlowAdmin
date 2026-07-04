import { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Button, Card, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Alert, IconButton, Tooltip, Snackbar,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/PersonAdd";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { supabase, invokeFn } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import UpiQrDialog from "../components/UpiQrDialog";

export default function Customers() {
  const { profile, isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [branch, setBranch] = useState(null);
  const [qrFor, setQrFor] = useState(null);
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone, address, active, created_at")
      .eq("role", "customer")
      .order("created_at", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }

  async function loadBranch() {
    if (!profile?.branch_id) return;
    const { data } = await supabase
      .from("branches").select("upi_id, upi_name").eq("id", profile.branch_id).single();
    setBranch(data);
  }

  useEffect(() => { load(); loadBranch(); }, [profile?.branch_id]);

  async function offboard(id, name) {
    if (!confirm(`Permanently remove ${name}? This deletes all their data.`)) return;
    try {
      await invokeFn("offboard-user", { target_id: id });
      setToast(`${name} removed`);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  const columns = useMemo(() => [
    { field: "full_name", headerName: "Name", flex: 1, minWidth: 150 },
    { field: "phone", headerName: "Phone", width: 140 },
    { field: "address", headerName: "Address", flex: 1, minWidth: 180 },
    {
      field: "active", headerName: "Status", width: 100,
      renderCell: (p) => (
        <Box component="span" sx={{ px: 1, py: 0.3, borderRadius: 1, fontSize: 12, fontWeight: 600,
          color: p.value ? "success.main" : "text.secondary",
          bgcolor: p.value ? "rgba(46,158,107,0.12)" : "rgba(0,0,0,0.05)" }}>
          {p.value ? "Active" : "Inactive"}
        </Box>
      ),
    },
    {
      field: "actions", headerName: "", width: 100, sortable: false, filterable: false,
      renderCell: (p) => (
        <Stack direction="row">
          <Tooltip title="Show UPI QR">
            <IconButton size="small" onClick={() => setQrFor(p.row)}><QrCode2Icon fontSize="small" /></IconButton>
          </Tooltip>
          {isAdmin && (
            <Tooltip title="Offboard">
              <IconButton size="small" color="error" onClick={() => offboard(p.row.id, p.row.full_name)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ], [isAdmin, branch]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">Customers</Typography>
          <Typography variant="body2" color="text.secondary">{rows.length} total</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          Add customer
        </Button>
      </Stack>

      <Card>
        <DataGrid
          autoHeight rows={rows} columns={columns} loading={loading} disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 25, 50]}
          sx={{ border: 0, "& .MuiDataGrid-columnHeaders": { bgcolor: "#f6f9fa" } }}
        />
      </Card>

      <AddCustomerDialog
        open={addOpen} onClose={() => setAddOpen(false)}
        onDone={(msg) => { setAddOpen(false); setToast(msg); load(); }}
      />

      <UpiQrDialog
        open={!!qrFor} onClose={() => setQrFor(null)}
        vpa={branch?.upi_id} payeeName={branch?.upi_name}
        customerName={qrFor?.full_name}
      />

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}

function AddCustomerDialog({ open, onClose, onDone }) {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", address: "", plan_id: "" });
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pwd, setPwd] = useState("");

  useEffect(() => {
    if (!open) return;
    setErr(""); setPwd("");
    supabase.from("plans").select("id, name, price, price_period").eq("active", true)
      .then(({ data }) => setPlans(data ?? []));
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setErr(""); setBusy(true);
    try {
      const res = await invokeFn("onboard-customer", {
        full_name: form.full_name, email: form.email, phone: form.phone,
        address: form.address, plan_id: form.plan_id || null,
      });
      setPwd(res.default_password);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add customer</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        {pwd ? (
          <Alert severity="success" sx={{ mt: 1 }}>
            Customer created. Temporary password: <b>{pwd}</b><br />
            Share this so they can log in to the mobile app and change it.
          </Alert>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Full name" required value={form.full_name} onChange={set("full_name")} />
            <TextField label="Email" type="email" required value={form.email} onChange={set("email")}
              helperText="Used to log in. Password will be firstname@1234" />
            <TextField label="Phone" value={form.phone} onChange={set("phone")} />
            <TextField label="Address" value={form.address} onChange={set("address")} multiline minRows={2} />
            <TextField select label="Subscription plan" value={form.plan_id} onChange={set("plan_id")}>
              <MenuItem value="">None</MenuItem>
              {plans.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} — ₹{p.price}/{p.price_period}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {pwd ? (
          <Button variant="contained" onClick={() => onDone("Customer added")}>Done</Button>
        ) : (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" onClick={submit}
              disabled={busy || !form.full_name || !form.email}>
              {busy ? "Creating…" : "Create"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
