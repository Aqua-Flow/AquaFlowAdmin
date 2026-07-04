import { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Card, Stack, Chip, MenuItem, Select, ToggleButton,
  ToggleButtonGroup, Snackbar,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import dayjs from "dayjs";

const TYPE_LABEL = {
  extra_water: "Extra water", new_connection: "New connection",
  jar_return: "Jar return", complaint: "Complaint", other: "Other",
};
const STATUS_FLOW = ["pending", "assigned", "in_progress", "completed", "rejected"];
const STATUS_COLOR = {
  pending: "warning", assigned: "info", in_progress: "primary",
  completed: "success", rejected: "default",
};

export default function Requests() {
  const { isPlatformAdmin } = useAuth();
  const { tenantId } = useTenant();
  const [branchId, setBranchId] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!tenantId) return;
    supabase.from("branches").select("id").eq("tenant_id", tenantId).limit(1)
      .then(({ data }) => setBranchId(data?.[0]?.id ?? null));
  }, [tenantId]);

  async function load() {
    setLoading(true);
    let q = supabase
      .from("requests")
      .select("id, type, quantity, note, status, created_at, customer_id, profiles!requests_customer_id_fkey(full_name, phone)")
      .order("created_at", { ascending: false });
    if (filter === "open") q = q.in("status", ["pending", "assigned", "in_progress"]);
    if (filter === "done") q = q.in("status", ["completed", "rejected"]);
    if (isPlatformAdmin && tenantId) {
      q = q.or(`tenant_id.eq.${tenantId},branch_id.eq.${branchId}`);
    }
    const { data } = await q;
    setRows((data ?? []).map((r) => ({
      ...r,
      name: r.profiles?.full_name ?? "—",
      phone: r.profiles?.phone ?? "",
    })));
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter, tenantId, branchId]);

  async function setStatus(id, status) {
    const patch = { status };
    if (status === "completed" || status === "rejected") patch.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("requests").update(patch).eq("id", id);
    if (error) { setToast(error.message); return; }
    setToast("Updated");
    load();
  }

  const columns = useMemo(() => [
    { field: "name", headerName: "Customer", flex: 1, minWidth: 140 },
    {
      field: "type", headerName: "Type", width: 150,
      renderCell: (p) => <Chip size="small" variant="outlined" label={TYPE_LABEL[p.value] ?? p.value} />,
    },
    { field: "quantity", headerName: "Qty", width: 70,
      valueFormatter: (v) => (v == null ? "" : v) },
    { field: "note", headerName: "Note", flex: 1.4, minWidth: 180 },
    {
      field: "created_at", headerName: "Raised", width: 130,
      valueFormatter: (v) => dayjs(v).format("DD MMM, HH:mm"),
    },
    {
      field: "status", headerName: "Status", width: 170, sortable: false,
      renderCell: (p) => isPlatformAdmin ? (
        <Chip size="small" color={STATUS_COLOR[p.value]} label={p.value.replace("_", " ")}
          sx={{ textTransform: "capitalize" }} />
      ) : (
        <Select size="small" value={p.value} variant="standard" disableUnderline
          onChange={(e) => setStatus(p.row.id, e.target.value)}
          renderValue={(v) => <Chip size="small" color={STATUS_COLOR[v]} label={v.replace("_", " ")}
            sx={{ textTransform: "capitalize" }} />}
          sx={{ "& .MuiSelect-select": { py: 0.3 } }}>
          {STATUS_FLOW.map((s) => (
            <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>{s.replace("_", " ")}</MenuItem>
          ))}
        </Select>
      ),
    },
  ], [isPlatformAdmin]);

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between"
        alignItems={{ sm: "center" }} spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">Requests</Typography>
          <Typography variant="body2" color="text.secondary">
            Water orders, complaints and service tickets raised from the customer app.
          </Typography>
        </Box>
        <ToggleButtonGroup size="small" exclusive value={filter}
          onChange={(_e, v) => v && setFilter(v)}>
          <ToggleButton value="open">Open</ToggleButton>
          <ToggleButton value="done">Resolved</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Card>
        <DataGrid
          autoHeight rows={rows} columns={columns} loading={loading} disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 15 } } }}
          pageSizeOptions={[15, 30]}
          sx={{ border: 0, "& .MuiDataGrid-columnHeaders": { bgcolor: "#f6f9fa" } }}
        />
      </Card>

      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}
