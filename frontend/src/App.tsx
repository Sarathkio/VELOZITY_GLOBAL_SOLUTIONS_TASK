import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthInit } from './hooks/useAuthInit';
import { useSocket } from './hooks/useSocket';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { TasksPage } from './pages/TasksPage';
import { UsersPage } from './pages/admin/UsersPage';
import { ClientsPage } from './pages/admin/ClientsPage';

export default function App() {
  // Initialize auth on mount — tries silent refresh via HttpOnly cookie
  useAuthInit();

  // Initialize WebSocket connection (only when authenticated)
  useSocket();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — all authenticated roles */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />

          {/* Admin + PM */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'PROJECT_MANAGER']} />}>
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
          </Route>

          {/* Admin only */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/clients" element={<ClientsPage />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
