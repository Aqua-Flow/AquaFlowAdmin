import { useEffect, useState } from "react";
import {
  Box, Typography, Card, CardContent, Stack, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Chip, FormControlLabel, Switch, Snackbar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PushPinIcon from "@mui/icons-material/PushPin";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import dayjs from "dayjs";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";

export default function Announcements() {
  const { profile, isPlatformAdmin } = useAuth();
  const { tenantId } = useTenant();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", pinned: false });
  const [toast, setToast] = useState("");

  function addTenantFilter(query, isPlatformAdmin, tenantId) {
    return isPlatformAdmin && tenantId ? query.eq("tenant_id", tenantId) : query;
  }

  async function load() {
    let q = supabase
      .from("announcements")
      .select("id, title, body, pinned, created_at")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    q = addTenantFilter(q, isPlatformAdmin, tenantId);
    const { data } = await q;
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, [tenantId]);

  async function create() {
    const { error } = await supabase.from("announcements").insert({
      title: form.title, body: form.body, pinned: form.pinned,
      created_by: profile.id, branch_id: profile.branch_id,
    });
    if (error) return setToast(error.message);
    setOpen(false); setForm({ title: "", body: "", pinned: false }); setToast("Posted"); load();
  }

  async function remove(id) {
    if (!confirm("Delete this notice?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    load();
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">Announcements</Typography>
          <Typography variant="body2" color="text.secondary">Notices shown in the customer app.</Typography>
        </Box>
        {!isPlatformAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>New notice</Button>
        )}
      </Stack>

      <Stack spacing={1.5}>
        {rows.length === 0 && (
          <Card><CardContent><Typography color="text.secondary">No announcements yet.</Typography></CardContent></Card>
        )}
        {rows.map((a) => (
          <Card key={a.id}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6">{a.title}</Typography>
                    {a.pinned && <Chip size="small" icon={<PushPinIcon />} label="Pinned" color="primary" />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{a.body}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dayjs(a.created_at).format("DD MMM YYYY, HH:mm")}
                  </Typography>
                </Box>
                {!isPlatformAdmin && (
                  <IconButton color="error" onClick={() => remove(a.id)}><DeleteOutlineIcon /></IconButton>
                )}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New announcement</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextField label="Message" multiline minRows={3} value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <FormControlLabel control={<Switch checked={form.pinned}
              onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />} label="Pin to top" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={create} disabled={!form.title || !form.body}>Post</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}
