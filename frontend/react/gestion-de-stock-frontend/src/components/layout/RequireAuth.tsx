import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../hooks/use-auth';

export function RequireAuth() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
