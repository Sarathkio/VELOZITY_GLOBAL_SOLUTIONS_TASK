import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { PageLoader } from '../components/ui/States';
import { Role } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

/**
 * ProtectedRoute — guards routes requiring authentication.
 * Note: this is UX-only protection. The backend enforces all authorization.
 * The API will reject unauthorized requests regardless of frontend routing.
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <PageLoader />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
