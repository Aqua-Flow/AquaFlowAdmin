import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  AppBar, Box, Drawer, IconButton, List, ListItemButton, ListItemIcon,
  ListItemText, Toolbar, Typography, Divider, Avatar, Menu, MenuItem, Chip,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/SpaceDashboard";
import PeopleIcon from "@mui/icons-material/People";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import PaymentsIcon from "@mui/icons-material/Payments";
import CampaignIcon from "@mui/icons-material/Campaign";
import BadgeIcon from "@mui/icons-material/Badge";
import SettingsIcon from "@mui/icons-material/Settings";
import ApartmentIcon from "@mui/icons-material/Apartment";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import { useAuth } from "../context/AuthContext";

const drawerWidth = 248;

const NAV = [
  { to: "/tenants", label: "Tenants", icon: <ApartmentIcon />, platformOnly: true },
  { to: "/", label: "Dashboard", icon: <DashboardIcon /> },
  { to: "/customers", label: "Customers", icon: <PeopleIcon /> },
  { to: "/deliveries", label: "Deliveries & Check-ins", icon: <LocalShippingIcon /> },
  { to: "/requests", label: "Requests", icon: <SupportAgentIcon /> },
  { to: "/payments", label: "Payments", icon: <PaymentsIcon /> },
  { to: "/announcements", label: "Announcements", icon: <CampaignIcon /> },
  { to: "/staff", label: "Staff", icon: <BadgeIcon />, admin: true },
  { to: "/settings", label: "Settings", icon: <SettingsIcon />, admin: true },
];

const ROLE_LABEL = {
  platform_admin: "Platform Admin",
  super_admin: "Super Admin",
  admin: "Admin",
  lower_admin: "Delivery",
};

export default function Layout() {
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const nav = useNavigate();
  const loc = useLocation();
  const { profile, isAdmin, isPlatformAdmin, signOut } = useAuth();

  const items = NAV.filter((n) =>
    isPlatformAdmin ? n.platformOnly : !n.platformOnly && (!n.admin || isAdmin)
  );

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Toolbar sx={{ gap: 1.2 }}>
        <Box sx={{ display: "grid", placeItems: "center", width: 36, height: 36,
          borderRadius: 2, bgcolor: "primary.main", color: "#fff" }}>
          <WaterDropIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={800} lineHeight={1}>AquaFlow</Typography>
          <Typography variant="caption" color="text.secondary">RO Water Ops</Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1, py: 1, flex: 1 }}>
        {items.map((n) => {
          const active = loc.pathname === n.to;
          return (
            <ListItemButton
              key={n.to}
              selected={active}
              onClick={() => { nav(n.to); setMobileOpen(false); }}
              sx={{
                borderRadius: 2, mb: 0.5,
                "&.Mui-selected": { bgcolor: "primary.main", color: "#fff",
                  "& .MuiListItemIcon-root": { color: "#fff" },
                  "&:hover": { bgcolor: "primary.dark" } },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: "text.secondary" }}>{n.icon}</ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} primary={n.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="fixed" elevation={0}
        sx={{ width: { md: `calc(100% - ${drawerWidth}px)` }, ml: { md: `${drawerWidth}px` },
          borderBottom: "1px solid rgba(15,41,51,0.08)" }}>
        <Toolbar>
          {!mdUp && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ flex: 1 }} />
          <Chip size="small" color="primary" variant="outlined"
            label={ROLE_LABEL[profile?.role] ?? "Staff"} sx={{ mr: 1.5, fontWeight: 600 }} />
          <IconButton onClick={(e) => setAnchor(e.currentTarget)} size="small">
            <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main", fontSize: 15 }}>
              {(profile?.full_name ?? "?").charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
            <MenuItem disabled sx={{ opacity: "1 !important" }}>
              <Box>
                <Typography variant="body2" fontWeight={700}>{profile?.full_name}</Typography>
                <Typography variant="caption" color="text.secondary">{ROLE_LABEL[profile?.role]}</Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setAnchor(null); signOut(); }}>Sign out</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={mdUp ? "permanent" : "temporary"}
          open={mdUp ? true : mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box",
            borderRight: "1px solid rgba(15,41,51,0.08)" } }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
