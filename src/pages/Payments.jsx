import { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Card, Stack, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Autocomplete, Snackbar, Chip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import UpiQrDialog from "../components/UpiQrDialog";

export default function Payments() {
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recOpen, setRecOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [branch, setBranch] = useState(null);
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("id, amount, method, paid_on, upi_ref, customer_id, profiles!payments_customer_id_fkey(full_name)")
      .order("paid_on", { ascending: false })
      .limit(200);
    setRows((data ?? []).map((r) => ({ ...r, name: r.profiles?.full_name ?? "—" })));

    const { data: cust } = await supabase
      .from("profiles").select("id, full_name").eq("role", "customer").order("full_name");
    setCustomers(cust ?? []);

    if (profile?.branch_id) {
      const { data: b } = await supabase
        .from("branches").select("upi_id, upi_name").eq("id", profile.branch_id).single();
      setBranch(b);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile?.branch_id]);

  function exportXlsx() {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      Customer: r.name, Amount: r.amount, Method: r.method,
      "Paid on": r.paid_on, "UPI Ref": r.upi_ref ?? "",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payments");
    XLSX.writeFile(wb, `payments_${dayjs().format("YYYY-MM-DD")}.xlsx`);
  }

  const columns = useMemo(() => [
    { field: "name", headerName: "Customer", flex: 1, minWidth: 150 },
    { field: "amount", headerName: "Amount", width: 120,
      valueFormatter: (v) => `₹${Number(v).toLocaleString("en-IN")}` },
    { field: "method", headerName: "Method", width: 110,
      renderCell: (p) => <Chip size="small" variant="outlined" label={p.value}
        sx={{ textTransform: "uppercase", fontSize: 11 }} /> },
    { field: "paid_on", headerName: "Date", width: 130,
      valueFormatter: (v) => dayjs(v).format("DD MMM YYYY") },
    { field: "upi_ref", headerName: "UPI Ref", flex: 1, minWidth: 140 },
  ], []);

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between"
        alignItems={{ sm: "center" }} spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">Payments</Typography>
          <Typography variant="body2" color="text.secondary">Record collections and show UPI QR.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<QrCode2Icon />} onClick={() => setQrOpen(true)}>UPI QR</Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportXlsx}>Export</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setRecOpen(true)}>
            Record payment
          </Button>
        </Stack>
      </Stack>

      <Card>
        <DataGrid
          autoHeight rows={rows} columns={columns} loading={loading} disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 15 } } }}
          pageSizeOptions={[15, 30, 60]}
          sx={{ border: 0, "& .MuiDataGrid-columnHeaders": { bgcolor: "#f6f9fa" } }}
        />
      </Card>

      <RecordDialog
        open={recOpen} onClose={() => setRecOpen(false)} customers={customers}
        onDone={() => { setRecOpen(false); setToast("Payment recorded"); load(); }}
      />

      <UpiQrDialog open={qrOpen} onClose={() => setQrOpen(false)}
        vpa={branch?.upi_id} payeeName={branch?.upi_name} />

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}

function RecordDialog({ open, onClose, customers, onDone }) {
  const [customer, setCustomer] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("upi");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (open) { setCustomer(null); setAmount(""); setMethod("upi"); setRef(""); setErr(""); } }, [open]);

  async function submit() {
    setErr(""); setBusy(true);
    const { error } = await supabase.rpc("record_payment", {
      p_customer: customer.id, p_amount: Number(amount), p_method: method, p_ref: ref || null,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    onDone();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Record payment</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {err && <Typography color="error" variant="body2">{err}</Typography>}
          <Autocomplete
            options={customers} getOptionLabel={(o) => o.full_name}
            value={customer} onChange={(_e, v) => setCustomer(v)}
            renderInput={(params) => <TextField {...params} label="Customer" required />}
          />
          <TextField label="Amount (₹)" type="number" value={amount}
            onChange={(e) => setAmount(e.target.value)} required />
          <TextField select label="Method" value={method} onChange={(e) => setMethod(e.target.value)}>
            <MenuItem value="upi">UPI</MenuItem>
            <MenuItem value="cash">Cash</MenuItem>
            <MenuItem value="card">Card</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
          {method === "upi" && (
            <TextField label="UPI reference / UTR" value={ref} onChange={(e) => setRef(e.target.value)} />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy || !customer || !amount}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
