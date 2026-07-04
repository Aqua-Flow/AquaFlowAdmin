import { Routes, Route, Navigate } from "react-router-dom";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "./context/AuthContext";
import { useTenant } from "./context/TenantContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Deliveries from "./pages/Deliveries";
import Requests from "./pages/Requests";
import Payments from "./pages/Payments";
import Dues from "./pages/Dues";
import Staff from "./pages/Staff";
import Announcements from "./pages/Announcements";
import Settings from "./pages/Settings";
import Tenants from "./pages/Tenants";

function Splash() {
  return (
    <Box sx={{ height: "100vh", display: "grid", placeItems: "center" }}>
      <CircularProgress />
    </Box>
  );
}

function NoAccess() {
  const { signOut } = useAuth();
  return (
    <Box sx={{ height: "100vh", display: "grid", placeItems: "center", textAlign: "center" }}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Your account doesn&apos;t have access to this app.
        </Typography>
        <Button variant="contained" onClick={signOut}>
          Sign out
        </Button>
      </Box>
    </Box>
  );
}

function Guard({ children, admin, platform, shell }) {
  const { session, loading, profile, isStaff, isAdmin, isPlatformAdmin } = useAuth();

  if (loading) return <Splash />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile || (!isStaff && !isPlatformAdmin)) return <NoAccess />;
  if (shell) return children;
  if (platform && !isPlatformAdmin) return <Navigate to="/" replace />;
  if (admin && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

function Home() {
  const { isPlatformAdmin } = useAuth();
  const { tenantId } = useTenant();

  if (isPlatformAdmin && !tenantId) return <Splash />;
  return <Dashboard />;
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return <Splash />;

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          <Guard shell>
            <Layout />
          </Guard>
        }
      >
        <Route index element={<Home />} />
        <Route path="/tenants" element={<Guard platform><Tenants /></Guard>} />
        <Route path="/customers" element={<Guard><Customers /></Guard>} />
        <Route path="/deliveries" element={<Guard><Deliveries /></Guard>} />
        <Route path="/requests" element={<Guard><Requests /></Guard>} />
        <Route path="/payments" element={<Guard><Payments /></Guard>} />
        <Route path="/dues" element={<Guard><Dues /></Guard>} />
        <Route path="/announcements" element={<Guard><Announcements /></Guard>} />
        <Route path="/staff" element={<Guard admin><Staff /></Guard>} />
        <Route path="/settings" element={<Guard admin><Settings /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}