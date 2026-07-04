import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  TextField, Stack,
} from "@mui/material";

// Build a standard UPI payment intent string.
// upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR&tn=NOTE
export function buildUpiUri({ vpa, name, amount, note }) {
  const p = new URLSearchParams();
  p.set("pa", vpa);
  if (name) p.set("pn", name);
  if (amount) p.set("am", Number(amount).toFixed(2));
  p.set("cu", "INR");
  if (note) p.set("tn", note);
  return `upi://pay?${p.toString()}`;
}

export default function UpiQrDialog({ open, onClose, vpa, payeeName, defaultAmount, customerName }) {
  const [amount, setAmount] = useState(defaultAmount ?? "");
  const [dataUrl, setDataUrl] = useState("");

  const note = customerName ? `AquaFlow dues - ${customerName}` : "AquaFlow dues";
  const uri = vpa ? buildUpiUri({ vpa, name: payeeName, amount, note }) : "";

  useEffect(() => {
    if (!open || !uri) return;
    QRCode.toDataURL(uri, { width: 260, margin: 1 }).then(setDataUrl).catch(() => setDataUrl(""));
  }, [open, uri]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Collect payment via UPI</DialogTitle>
      <DialogContent>
        {!vpa ? (
          <Typography color="error" variant="body2">
            No UPI ID set for this branch. Add one under Settings first.
          </Typography>
        ) : (
          <Stack spacing={2} alignItems="center" sx={{ pt: 1 }}>
            <TextField
              label="Amount (₹)" type="number" size="small" fullWidth value={amount}
              onChange={(e) => setAmount(e.target.value)}
              helperText="Leave blank to let the customer enter the amount"
            />
            {dataUrl ? (
              <Box component="img" src={dataUrl} alt="UPI QR"
                sx={{ width: 240, height: 240, borderRadius: 2, border: "1px solid rgba(0,0,0,0.08)" }} />
            ) : (
              <Box sx={{ width: 240, height: 240, display: "grid", placeItems: "center" }}>
                <Typography variant="body2" color="text.secondary">Generating…</Typography>
              </Box>
            )}
            <Box textAlign="center">
              <Typography variant="body2" fontWeight={700}>{payeeName}</Typography>
              <Typography variant="caption" color="text.secondary">{vpa}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              Scan with any UPI app (GPay, PhonePe, Paytm). The customer confirms in their app.
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
