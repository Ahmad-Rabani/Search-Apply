import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { AuthPage } from "./pages/AuthPage";
import { JobsPage } from "./pages/JobsPage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { TrackerPage } from "./pages/TrackerPage";
import { AgentPage } from "./pages/AgentPage";
import { DashboardPage } from "./pages/DashboardPage";

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-teal-950/60">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/:id" element={<JobDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="tracker" element={<TrackerPage />} />
          <Route path="agent" element={<AgentPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
