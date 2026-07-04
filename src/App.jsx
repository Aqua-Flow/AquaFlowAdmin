import { Routes, Route, Navigate } from "react-router-dom";
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

function Splash() {
  return (
    <Box sx={{ height: "100vh", display: "grid", placeItems: "center" }}>
      <CircularProgress />
    </Box>
  );
}

function Guard({ children, admin }) {
  const { session, profile, loading, isStaff, isAdmin } = useAuth();
  if (loading) return <Splash />;
  if (!session) return <Navigate to="/login" replace />;
  if (!isStaff) return <Navigate to="/login" replace />;
  if (admin && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { session, loading } = useAuth();
  if (loading) return <Splash />;

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/deliveries" element={<Deliveries />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route
          path="/staff"
          element={
            <Guard admin>
              <Staff />
            </Guard>
          }
        />
        <Route
          path="/settings"
          element={
            <Guard admin>
              <Settings />
            </Guard>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
