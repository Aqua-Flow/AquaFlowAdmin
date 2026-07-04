import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Typography, Card, Stack, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Alert, Chip, IconButton, Tooltip, Snackbar,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import ReceiptIcon from "@mui/icons-material/Receipt";
import dayjs from "dayjs";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";

const inr = (v) => `₹${Number(v ?? 0).toLocaleString("en-IN")}`;

const STATUS_COLOR = { unpaid: "error", partial: "warning", paid: "success", waived: "default" };

export default function Dues() {
  const { isAdmin, isPlatformAdmin } = useAuth();
  const { tenantId } = useTenant();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // { customer_id, full_name }
  const [invoices, setInvoices] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invoiceFor, setInvoiceFor] = useState(null); // customer row for Create invoice dialog
  const [payInvoice, setPayInvoice] = useState(null); // invoice row for Record payment dialog
  const [toast, setToast] = useState("");
  const invoicesRef = useRef(null);

  function addTenantFilter(query, isPlatformAdmin, tenantId) {
    return isPlatformAdmin && tenantId ? query.eq("tenant_id", tenantId) : query;
  }

  async function load() {
    setLoading(true);
    let q = supabase
      .from("customer_dues")
      .select("customer_id, full_name, phone, amount_due, open_invoices, earliest_due_date")
      .order("amount_due", { ascending: false });
    q = addTenantFilter(q, isPlatformAdmin, tenantId);
    const { data, error } = await q;
    if (error) setToast(error.message);
    setRows(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); setSelected(null); }, [tenantId]);

  async function loadInvoices(customerId) {
    setInvLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("id, amount, period_start, period_end, due_date, status, note, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (error) setToast(error.message);
    setInvoices(data ?? []);
    setInvLoading(false);
  }
  useEffect(() => { if (selected) loadInvoices(selected.customer_id); }, [selected?.customer_id]);

  function openInvoices(row) {
    setSelected(row);
    setTimeout(() => invoicesRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function refreshAll() {
    await load();
    if (selected) await loadInvoices(selected.customer_id);
  }

  async function waive(inv) {
    if (!confirm(`Waive this invoice of ${inr(inv.amount)}?`)) return;
    const { error } = await supabase.rpc("waive_invoice", { p_invoice_id: inv.id });
    if (error) { setToast(error.message); return; }
    setToast("Invoice waived");
    refreshAll();
  }

  const today = dayjs().startOf("day");

  const dueColumns = useMemo(() => [
    { field: "full_name", headerName: "Customer", flex: 1, minWidth: 160 },
    { field: "phone", headerName: "Phone", width: 140 },
    { field: "open_invoices", headerName: "Open invoices", width: 130 },
    {
      field: "amount_due", headerName: "Amount due", width: 140,
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={700}
          color={Number(p.value) > 0 ? "error.main" : "text.primary"}>
          {inr(p.value)}
        </Typography>
      ),
    },
    {
      field: "earliest_due_date", headerName: "Earliest due", width: 140,
      renderCell: (p) => p.value ? (
        <Typography variant="body2"
          color={dayjs(p.value).isBefore(today) ? "error.main" : "text.primary"}>
          {dayjs(p.value).format("DD MMM YYYY")}
        </Typography>
      ) : "—",
    },
    {
      field: "actions", headerName: "", width: 100, sortable: false, filterable: false,
      renderCell: (p) => (
        <>
          {!isPlatformAdmin && (
            <Tooltip title="Create invoice">
              <IconButton size="small" color="primary"
                onClick={(e) => { e.stopPropagation(); setInvoiceFor(p.row); }}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="View invoices">
            <IconButton size="small"
              onClick={(e) => { e.stopPropagation(); openInvoices(p.row); }}>
              <ReceiptIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ], [isPlatformAdmin, tenantId]);

  const invColumns = useMemo(() => [
    {
      field: "period", headerName: "Period", flex: 1, minWidth: 190, sortable: false,
      valueGetter: (_, row) =>
        `${dayjs(row.period_start).format("DD MMM")} – ${dayjs(row.period_end).format("DD MMM YYYY")}`,
    },
    {
      field: "amount", headerName: "Amount", width: 130,
      renderCell: (p) => <Typography variant="body2" fontWeight={700}>{inr(p.value)}</Typography>,
    },
    {
      field: "due_date", headerName: "Due date", width: 140,
      renderCell: (p) => (
        <Typography variant="body2"
          color={dayjs(p.value).isBefore(today) && !["paid", "waived"].includes(p.row.status)
            ? "error.main" : "text.primary"}>
          {dayjs(p.value).format("DD MMM YYYY")}
        </Typography>
      ),
    },
    {
      field: "status", headerName: "Status", width: 110,
      renderCell: (p) => <Chip size="small" color={STATUS_COLOR[p.value] ?? "default"}
        label={p.value} sx={{ textTransform: "capitalize" }} />,
    },
    ...(!isPlatformAdmin ? [{
      field: "actions", headerName: "", width: 160, sortable: false, filterable: false,
      renderCell: (p) => {
        const closed = ["paid", "waived"].includes(p.row.status);
        return (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" disabled={closed}
              onClick={() => setPayInvoice(p.row)}>Pay</Button>
            {isAdmin && (
              <Button size="small" color="error" disabled={closed}
                onClick={() => waive(p.row)}>Waive</Button>
            )}
          </Stack>
        );
      },
    }] : []),
  ], [isPlatformAdmin, isAdmin, selected?.customer_id]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">Dues</Typography>
          <Typography variant="body2" color="text.secondary">
            Outstanding balances, invoices and collections.
          </Typography>
        </Box>
      </Stack>

      <Card>
        <DataGrid autoHeight rows={rows} columns={dueColumns} loading={loading}
          getRowId={(r) => r.customer_id} disableRowSelectionOnClick
          onRowClick={(p) => openInvoices(p.row)}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 25]}
          sx={{ border: 0, "& .MuiDataGrid-columnHeaders": { bgcolor: "#f6f9fa" } }} />
      </Card>

      {selected && (
        <Card ref={invoicesRef} sx={{ mt: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, pb: 0 }}>
            <Typography variant="h6">Invoices — {selected.full_name}</Typography>
            {!isPlatformAdmin && (
              <Button size="small" variant="contained" startIcon={<AddIcon />}
                onClick={() => setInvoiceFor(selected)}>
                Create invoice
              </Button>
            )}
          </Stack>
          <DataGrid autoHeight rows={invoices} columns={invColumns} loading={invLoading}
            disableRowSelectionOnClick
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25]}
            sx={{ border: 0, mt: 1, "& .MuiDataGrid-columnHeaders": { bgcolor: "#f6f9fa" } }} />
        </Card>
      )}

      <CreateInvoiceDialog
        open={!!invoiceFor}
        customer={invoiceFor}
        onClose={() => setInvoiceFor(null)}
        onDone={() => { setInvoiceFor(null); setToast("Invoice created"); refreshAll(); }}
      />

      <RecordPaymentDialog
        open={!!payInvoice}
        invoice={payInvoice}
        onClose={() => setPayInvoice(null)}
        onDone={() => { setPayInvoice(null); setToast("Payment recorded"); refreshAll(); }}
      />

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}

function CreateInvoiceDialog({ open, customer, onClose, onDone }) {
  const [form, setForm] = useState({ amount: "", period_start: "", period_end: "", due_date: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open || !customer) return;
    setErr("");
    setForm({ amount: "", period_start: "", period_end: "", due_date: "", note: "" });
    (async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("custom_price, custom_price_period, plans(price, price_period)")
        .eq("customer_id", customer.customer_id)
        .order("created_at", { ascending: false })
        .limit(1);
      const sub = data?.[0];
      const price = sub?.custom_price ?? sub?.plans?.price;
      if (price != null) setForm((f) => ({ ...f, amount: String(price) }));
    })();
  }, [open, customer?.customer_id]);

  const set = (k) => (e) => setForm((f) => {
    const next = { ...f, [k]: e.target.value };
    if (k === "period_end" && !f.due_date) next.due_date = e.target.value;
    return next;
  });

  async function submit() {
    setErr(""); setBusy(true);
    const { error } = await supabase.rpc("create_invoice", {
      p_customer: customer.customer_id,
      p_amount: Number(form.amount),
      p_period_start: form.period_start,
      p_period_end: form.period_end,
      p_due_date: form.due_date || form.period_end,
      p_note: form.note || null,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onDone();
  }

  const valid = Number(form.amount) > 0 && form.period_start && form.period_end;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create invoice — {customer?.full_name}</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Amount (₹)" required type="number" value={form.amount} onChange={set("amount")} />
          <TextField label="Period start" required type="date" value={form.period_start}
            onChange={set("period_start")} InputLabelProps={{ shrink: true }} />
          <TextField label="Period end" required type="date" value={form.period_end}
            onChange={set("period_end")} InputLabelProps={{ shrink: true }} />
          <TextField label="Due date" type="date" value={form.due_date}
            onChange={set("due_date")} InputLabelProps={{ shrink: true }}
            helperText="Defaults to period end" />
          <TextField label="Note (optional)" value={form.note} onChange={set("note")} multiline rows={2} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy || !valid}>
          {busy ? "Creating…" : "Create invoice"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function RecordPaymentDialog({ open, invoice, onClose, onDone }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open || !invoice) return;
    setErr(""); setMethod("cash"); setRef(""); setAmount("");
    (async () => {
      const { data } = await supabase.from("payments").select("amount").eq("invoice_id", invoice.id);
      const paid = (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const remaining = Math.max(Number(invoice.amount) - paid, 0);
      setAmount(String(remaining));
    })();
  }, [open, invoice?.id]);

  async function submit() {
    setErr(""); setBusy(true);
    const { error } = await supabase.rpc("pay_invoice", {
      p_invoice_id: invoice.id,
      p_amount: Number(amount),
      p_method: method,
      p_ref: ref || null,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onDone();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Record payment</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Amount (₹)" required type="number" value={amount}
            onChange={(e) => setAmount(e.target.value)} />
          <TextField select label="Method" value={method} onChange={(e) => setMethod(e.target.value)}>
            <MenuItem value="cash">Cash</MenuItem>
            <MenuItem value="upi">UPI</MenuItem>
            <MenuItem value="card">Card</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
          {method === "upi" && (
            <TextField label="UPI reference" value={ref} onChange={(e) => setRef(e.target.value)} />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy || !(Number(amount) > 0)}>
          {busy ? "Saving…" : "Record payment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
