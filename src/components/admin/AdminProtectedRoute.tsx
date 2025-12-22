import { Navigate } from 'react-router-dom';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const adminToken = localStorage.getItem('adminToken');
  const adminUser = localStorage.getItem('adminUser');

  if (!adminToken || !adminUser) {
    return <Navigate to="/admin/login" replace />;
  }

  try {
    const user = JSON.parse(adminUser);
    if (user.role !== 'admin') {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      return <Navigate to="/admin/login" replace />;
    }
  } catch {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;

