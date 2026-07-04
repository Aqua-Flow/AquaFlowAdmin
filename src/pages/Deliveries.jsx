import { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Card, Stack, Button, Chip, TextField, IconButton, Tooltip, Snackbar,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DownloadIcon from "@mui/icons-material/Download";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";

const statusColor = { matched: "success", mismatch: "warning", unconfirmed: "info", disputed: "error" };
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Deliveries() {
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    // all customers
    const { data: customers } = await supabase
      .from("profiles").select("id, full_name, phone").eq("role", "customer").eq("active", true)
      .order("full_name");

    // reconciliation rows for the date
    const { data: recon } = await supabase
      .from("reconciliation")
      .select("customer_id, jars_delivered, jars_confirmed, received, status")
      .eq("day", date);

    const reconBy = Object.fromEntries((recon ?? []).map((r) => [r.customer_id, r]));
    const merged = (customers ?? []).map((c) => {
      const r = reconBy[c.id];
      return {
        id: c.id, name: c.full_name, phone: c.phone,
        jars_delivered: r?.jars_delivered ?? null,
        jars_confirmed: r?.jars_confirmed ?? null,
        status: r?.status ?? "unconfirmed",
        logged: r?.jars_delivered != null,
      };
    });
    setRows(merged);
    setLoading(false);
  }

  useEffect(() => { load(); }, [date]);

  async function logDelivery(customerId, jars) {
    if (jars < 0) return;
    // Only allow logging for "today" — historical edits could be added similarly.
    const { error } = await supabase.rpc("log_delivery", {
      p_customer: customerId, p_jars: jars, p_empty: 0, p_method: "route",
    });
    if (error) { setToast(error.message); return; }
    setToast("Delivery logged");
    load();
  }

  function exportXlsx() {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      Customer: r.name, Phone: r.phone,
      "Jars delivered (staff)": r.jars_delivered ?? "",
      "Jars confirmed (customer)": r.jars_confirmed ?? "",
      Status: r.status,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Deliveries");
    XLSX.writeFile(wb, `deliveries_${date}.xlsx`);
  }

  const isToday = date === todayStr();

  const columns = useMemo(() => [
    { field: "name", headerName: "Customer", flex: 1, minWidth: 150 },
    {
      field: "jars_delivered", headerName: "Delivered (staff)", width: 190,
      renderCell: (p) => (
        <Stack direction="row" alignItems="center" spacing={0.5}>
          {isToday && (
            <IconButton size="small" disabled={!p.row.logged || (p.value ?? 0) <= 0}
              onClick={() => logDelivery(p.row.id, (p.value ?? 0) - 1)}>
              <RemoveIcon fontSize="inherit" />
            </IconButton>
          )}
          <Chip size="small" variant="outlined"
            label={p.value == null ? "—" : `${p.value} jar${p.value === 1 ? "" : "s"}`} />
          {isToday && (
            <IconButton size="small" color="primary"
              onClick={() => logDelivery(p.row.id, (p.value ?? 0) + 1)}>
              <AddIcon fontSize="inherit" />
            </IconButton>
          )}
        </Stack>
      ),
    },
    {
      field: "jars_confirmed", headerName: "Confirmed (customer)", width: 170,
      renderCell: (p) => <Chip size="small" variant="outlined"
        label={p.value == null ? "no check-in" : `${p.value} jar${p.value === 1 ? "" : "s"}`} />,
    },
    {
      field: "status", headerName: "Reconciliation", width: 150,
      renderCell: (p) => (
        <Chip size="small" color={statusColor[p.value]} label={p.value}
          icon={p.value === "matched" ? <CheckCircleIcon /> : undefined}
          sx={{ textTransform: "capitalize" }} />
      ),
    },
  ], [isToday, rows]);

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }}
        justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">Deliveries & Check-ins</Typography>
          <Typography variant="body2" color="text.secondary">
            Delivery staff log jars; customers confirm from the app. Mismatches flag automatically.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <TextField type="date" size="small" value={date}
            onChange={(e) => setDate(e.target.value)} inputProps={{ max: todayStr() }} />
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportXlsx}>Export</Button>
        </Stack>
      </Stack>

      <Card>
        <DataGrid
          autoHeight rows={rows} columns={columns} loading={loading} disableRowSelectionOnClick
          getRowId={(r) => r.id}
          initialState={{ pagination: { paginationModel: { pageSize: 15 } } }}
          pageSizeOptions={[15, 30, 60]}
          sx={{ border: 0, "& .MuiDataGrid-columnHeaders": { bgcolor: "#f6f9fa" } }}
        />
      </Card>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}
