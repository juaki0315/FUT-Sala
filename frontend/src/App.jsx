import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import RevealModal from "./components/RevealModal";
import Login from "./pages/Login";
import Register from "./pages/Register";
import HomePage from "./pages/HomePage";
import MyCard from "./pages/MyCard";
import Matches from "./pages/Matches";
import MatchDetail from "./pages/MatchDetail";
import Totw from "./pages/Totw";
import CalibrationList from "./pages/CalibrationList";
import CalibrateForm from "./pages/CalibrateForm";
import AccountSettings from "./pages/AccountSettings";
import PlayersBrowser from "./pages/PlayersBrowser";
import PlayerDetail from "./pages/PlayerDetail";
import AdminUsersOverview from "./pages/AdminUsersOverview";

function PrivateRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pitch-950 text-floodlight-300/40 text-sm">
        Cargando...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <HomePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/mi-carta"
        element={
          <PrivateRoute>
            <MyCard />
          </PrivateRoute>
        }
      />
      <Route
        path="/partidos"
        element={
          <PrivateRoute>
            <Matches />
          </PrivateRoute>
        }
      />
      <Route
        path="/partidos/:id"
        element={
          <PrivateRoute>
            <MatchDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/totj"
        element={
          <PrivateRoute>
            <Totw />
          </PrivateRoute>
        }
      />
      <Route
        path="/calibracion"
        element={
          <PrivateRoute>
            <CalibrationList />
          </PrivateRoute>
        }
      />
      <Route
        path="/calibracion/:targetId"
        element={
          <PrivateRoute>
            <CalibrateForm />
          </PrivateRoute>
        }
      />
      <Route
        path="/jugadores"
        element={
          <PrivateRoute>
            <PlayersBrowser />
          </PrivateRoute>
        }
      />
      <Route
        path="/jugadores/:id"
        element={
          <PrivateRoute>
            <PlayerDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <PrivateRoute>
            <AdminUsersOverview />
          </PrivateRoute>
        }
      />
      <Route
        path="/cuenta"
        element={
          <PrivateRoute>
            <AccountSettings />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RevealGate() {
  const { pendingReveal, dismissPendingReveal } = useAuth();
  return <RevealModal reveal={pendingReveal} onClose={dismissPendingReveal} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <RevealGate />
        </BrowserRouter>
      </AuthProvider>
      <Analytics />
    </ErrorBoundary>
  );
}
