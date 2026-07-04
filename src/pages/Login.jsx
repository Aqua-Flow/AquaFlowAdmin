import { useState } from "react";
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, Stack, InputAdornment,
} from "@mui/material";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) setErr(error.message);
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center",
      background: "linear-gradient(160deg,#e6f3f6,#f2f6f8)" }}>
      <Card sx={{ width: 400, maxWidth: "92vw" }}>
        <CardContent sx={{ p: 4 }}>
          <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <Box sx={{ display: "grid", placeItems: "center", width: 52, height: 52,
              borderRadius: 3, bgcolor: "primary.main", color: "#fff" }}>
              <WaterDropIcon />
            </Box>
            <Typography variant="h5">AquaFlow Admin</Typography>
            <Typography variant="body2" color="text.secondary">Sign in to manage your RO service</Typography>
          </Stack>

          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

          <form onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField label="Email" type="email" required fullWidth value={email}
                onChange={(e) => setEmail(e.target.value)} />
              <TextField label="Password" type="password" required fullWidth value={password}
                onChange={(e) => setPassword(e.target.value)} />
              <Button type="submit" variant="contained" size="large" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
