import { useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Deliveries from "./pages/Deliveries";
import Requests from "./pages/Requests";
import Payments from "./pages/Payments";
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

function Redirect({ to }) {
  const navigate = useNavigate();
  useEffect(() => { navigate(to, { replace: true }); }, [navigate, to]);
  return null;
}

function Guard({ children, admin, platform, shell }) {
  const { session, loading, isStaff, isAdmin, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session || (!isStaff && !isPlatformAdmin)) {
      navigate("/login", { replace: true });
      return;
    }
    if (shell) return;
    if (platform && !isPlatformAdmin) {
      navigate("/", { replace: true });
      return;
    }
    if (!platform && isPlatformAdmin) {
      navigate("/tenants", { replace: true });
      return;
    }
    if (admin && !isAdmin) {
      navigate("/", { replace: true });
    }
  }, [loading, session, isStaff, isAdmin, isPlatformAdmin, platform, admin, shell, navigate]);

  if (loading) return <Splash />;
  if (!session || (!isStaff && !isPlatformAdmin)) return null;
  if (shell) return children;
  if (platform && !isPlatformAdmin) return null;
  if (!platform && isPlatformAdmin) return null;
  if (admin && !isAdmin) return null;
  return children;
}

function Home() {
  const { isPlatformAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isPlatformAdmin) {
      navigate("/tenants", { replace: true });
    }
  }, [isPlatformAdmin, navigate]);

  if (isPlatformAdmin) return null;
  return <Dashboard />;
}

export default function App() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      // no-op: just here to prevent any initial flash redirect
    }
  }, [loading, session, navigate]);

  if (loading) return <Splash />;

  return (
    <Routes>
      <Route path="/login" element={session ? <Redirect to="/" /> : <Login />} />
      <Route
        element={
          <Guard shell>
            <Layout />
          </Guard>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/tenants" element={<Guard platform><Tenants /></Guard>} />
        <Route path="/customers" element={<Guard><Customers /></Guard>} />
        <Route path="/deliveries" element={<Guard><Deliveries /></Guard>} />
        <Route path="/requests" element={<Guard><Requests /></Guard>} />
        <Route path="/payments" element={<Guard><Payments /></Guard>} />
        <Route path="/announcements" element={<Guard><Announcements /></Guard>} />
        <Route path="/staff" element={<Guard admin><Staff /></Guard>} />
        <Route path="/settings" element={<Guard admin><Settings /></Guard>} />
      </Route>
      <Route path="*" element={<Redirect to="/" />} />
    </Routes>
  );
}