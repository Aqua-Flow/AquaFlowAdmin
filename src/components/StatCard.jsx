import { Card, CardContent, Box, Typography } from "@mui/material";

export default function StatCard({ label, value, icon, tone = "primary", hint }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase"
            letterSpacing={0.5}>
            {label}
          </Typography>
          <Box sx={{ color: `${tone}.main`, display: "grid", placeItems: "center",
            width: 36, height: 36, borderRadius: 2, bgcolor: `${tone}.main`, opacity: 0.12 }} />
          <Box sx={{ position: "relative", ml: -4.5, color: `${tone}.main` }}>{icon}</Box>
        </Box>
        <Typography variant="h4" sx={{ mt: 1.2 }}>{value}</Typography>
        {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
      </CardContent>
    </Card>
  );
}
