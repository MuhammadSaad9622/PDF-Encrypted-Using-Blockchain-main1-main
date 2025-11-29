import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './utils/theme';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import Dashboard from './components/Dashboard';
import DashboardHome from './components/DashboardHome';
import UploadPDF from './components/UploadPDF';
import MyNFTs from './components/MyNFTs';
import ViewPDF from './components/ViewPDF';
import Settings from './components/Settings';
import UserInvoices from './components/UserInvoices';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';

function App() {
  return (
    <ThemeProvider>
      <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<Navigate to="/signin" replace />} />
            <Route path="/admin/login" element={<Navigate to="/signin" replace />} />
            <Route
              path="/admin/dashboard"
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              }
            />
            
            {/* Protected Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="upload" element={<UploadPDF />} />
              <Route path="my-nfts" element={<MyNFTs />} />
              <Route path="invoices" element={<UserInvoices />} />
              <Route path="settings" element={<Settings />} />
              <Route path="view/:tokenId" element={<ViewPDF />} />
            </Route>

            {/* Redirect root to dashboard or signin */}
            <Route
              path="/"
              element={
                localStorage.getItem('token') ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/signin" replace />
                )
              }
            />
          </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;