import { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Button, Card, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Alert, IconButton, Tooltip, Snackbar,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/PersonAdd";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { supabase, invokeFn } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import UpiQrDialog from "../components/UpiQrDialog";

export default function Customers() {
  const { profile, isAdmin, isPlatformAdmin } = useAuth();
  const { tenantId } = useTenant();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [branch, setBranch] = useState(null);
  const [qrFor, setQrFor] = useState(null);
  const [priceFor, setPriceFor] = useState(null);
  const [toast, setToast] = useState("");

  function addTenantFilter(query, isPlatformAdmin, tenantId) {
    return isPlatformAdmin && tenantId ? query.eq("tenant_id", tenantId) : query;
  }

  async function load() {
    setLoading(true);
    let q = supabase
      .from("profiles")
      .select("id, full_name, phone, address, active, created_at")
      .eq("role", "customer")
      .order("created_at", { ascending: false });
    q = addTenantFilter(q, isPlatformAdmin, tenantId);
    const { data } = await q;

    // pull each customer's latest subscription to show the effective price
    let customers = data ?? [];
    if (customers.length) {
      const ids = customers.map((c) => c.id);
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("customer_id, custom_price, custom_price_period, created_at, plans(price, price_period)")
        .in("customer_id", ids)
        .order("created_at", { ascending: false });
      const latest = {};
      (subs ?? []).forEach((s) => { if (!latest[s.customer_id]) latest[s.customer_id] = s; });
      customers = customers.map((c) => {
        const s = latest[c.id];
        const price = s ? (s.custom_price ?? s.plans?.price ?? null) : null;
        const period = s ? (s.custom_price_period ?? s.plans?.price_period ?? "") : "";
        return { ...c, price, period, custom: !!s?.custom_price };
      });
    }
    setRows(customers);
    setLoading(false);
  }

  async function loadBranch() {
    if (!profile?.branch_id) return;
    const { data } = await supabase
      .from("branches").select("upi_id, upi_name").eq("id", profile.branch_id).single();
    setBranch(data);
  }

  useEffect(() => { load(); loadBranch(); }, [profile?.branch_id, tenantId]);

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
      field: "price", headerName: "Price", width: 130,
      renderCell: (p) => p.row.price == null ? (
        <Box component="span" sx={{ color: "text.secondary", fontSize: 13 }}>—</Box>
      ) : (
        <Box component="span" sx={{ fontSize: 13, fontWeight: 600 }}>
          ₹{Number(p.row.price).toLocaleString("en-IN")}
          <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>/{p.row.period}</Box>
          {p.row.custom && (
            <Box component="span" sx={{ ml: 0.5, px: 0.6, py: 0.1, borderRadius: 1, fontSize: 10,
              fontWeight: 700, color: "primary.main", bgcolor: "rgba(2,136,166,0.12)" }}>CUSTOM</Box>
          )}
        </Box>
      ),
    },
    {
      field: "actions", headerName: "", width: 130, sortable: false, filterable: false,
      renderCell: (p) => isPlatformAdmin ? null : (
        <Stack direction="row">
          <Tooltip title="Show UPI QR">
            <IconButton size="small" onClick={() => setQrFor(p.row)}><QrCode2Icon fontSize="small" /></IconButton>
          </Tooltip>
          {isAdmin && (
            <Tooltip title="Set price">
              <IconButton size="small" color="primary" onClick={() => setPriceFor(p.row)}>
                <CurrencyRupeeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
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
  ], [isAdmin, branch, isPlatformAdmin]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">Customers</Typography>
          <Typography variant="body2" color="text.secondary">{rows.length} total</Typography>
        </Box>
        {!isPlatformAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
            Add customer
          </Button>
        )}
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

      <SetPriceDialog
        open={!!priceFor} onClose={() => setPriceFor(null)} customer={priceFor}
        onDone={() => { setPriceFor(null); setToast("Price updated"); load(); }}
      />

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}

function AddCustomerDialog({ open, onClose, onDone }) {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", address: "", plan_id: "", custom_price: "" });
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pwd, setPwd] = useState("");

  useEffect(() => {
    if (!open) return;
    setErr(""); setPwd("");
    setForm({ full_name: "", email: "", phone: "", address: "", plan_id: "", custom_price: "" });
    supabase.from("plans").select("id, name, price, price_period").eq("active", true)
      .then(({ data }) => setPlans(data ?? []));
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const selectedPlan = plans.find((p) => p.id === form.plan_id);

  async function submit() {
    setErr(""); setBusy(true);
    try {
      const res = await invokeFn("onboard-customer", {
        full_name: form.full_name, email: form.email, phone: form.phone,
        address: form.address, plan_id: form.plan_id || null,
        custom_price: form.custom_price === "" ? null : Number(form.custom_price),
        custom_price_period: form.custom_price === "" ? null : (selectedPlan?.price_period ?? "monthly"),
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
            <TextField label="Custom price (₹) — optional" type="number" value={form.custom_price}
              onChange={set("custom_price")}
              helperText={selectedPlan
                ? `Overrides the plan's ₹${selectedPlan.price}/${selectedPlan.price_period} for this customer`
                : "Set a per-customer price. You can also change it later."} />
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

function SetPriceDialog({ open, onClose, customer, onDone }) {
  const [sub, setSub] = useState(null);        // existing subscription row (or null)
  const [price, setPrice] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [planPrice, setPlanPrice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open || !customer) return;
    setErr("");
    supabase
      .from("subscriptions")
      .select("id, custom_price, custom_price_period, plans(price, price_period)")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const s = data?.[0] ?? null;
        setSub(s);
        setPrice(s?.custom_price != null ? String(s.custom_price) : "");
        setPeriod(s?.custom_price_period ?? s?.plans?.price_period ?? "monthly");
        setPlanPrice(s?.plans?.price ?? null);
      });
  }, [open, customer]);

  async function save() {
    setErr(""); setBusy(true);
    const custom_price = price === "" ? null : Number(price);
    try {
      if (sub?.id) {
        const { error } = await supabase.from("subscriptions")
          .update({ custom_price, custom_price_period: custom_price == null ? null : period })
          .eq("id", sub.id);
        if (error) throw error;
      } else {
        // no subscription yet — create one carrying the custom price
        const { data: cp } = await supabase.from("profiles")
          .select("tenant_id, branch_id").eq("id", customer.id).single();
        const { error } = await supabase.from("subscriptions").insert({
          customer_id: customer.id, tenant_id: cp?.tenant_id, branch_id: cp?.branch_id,
          status: "active", custom_price, custom_price_period: custom_price == null ? null : period,
        });
        if (error) throw error;
      }
      onDone();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Set price — {customer?.full_name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {err && <Alert severity="error">{err}</Alert>}
          {planPrice != null && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              Plan price is ₹{planPrice}. A custom price below overrides it for this customer only.
            </Alert>
          )}
          <TextField label="Custom price (₹)" type="number" value={price}
            onChange={(e) => setPrice(e.target.value)}
            helperText="Leave blank to remove the override and use the plan price" />
          <TextField select label="Per" value={period} onChange={(e) => setPeriod(e.target.value)}
            disabled={price === ""}>
            <MenuItem value="monthly">month</MenuItem>
            <MenuItem value="weekly">week</MenuItem>
            <MenuItem value="per_jar">jar</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save price"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
