import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './admin/components/AdminLayout';
import AdminRoute from './admin/components/AdminRoute';
import { AdminAuthProvider } from './admin/context/AdminAuthContext';
import AdminDashboard from './admin/pages/AdminDashboard';
import ComplaintDetail from './admin/pages/ComplaintDetail';
import ComplaintsList from './admin/pages/ComplaintsList';
import DashcamDemo from './admin/pages/DashcamDemo';
import MapOverview from './admin/pages/MapOverview';
import AdminLogin from './admin/pages/AdminLogin';
import DashboardShell from './components/DashboardShell';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { APP_ROUTES } from './constants/app';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ComplaintDetailPage from './pages/complaints/ComplaintDetailPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import MyComplaintsPage from './pages/dashboard/MyComplaintsPage';
import ReportIssuePage from './pages/dashboard/ReportIssuePage';

function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to={APP_ROUTES.login} replace />} />
            <Route path={APP_ROUTES.login} element={<LoginPage />} />
            <Route path={APP_ROUTES.register} element={<RegisterPage />} />
            <Route path={APP_ROUTES.forgotPassword} element={<ForgotPasswordPage />} />

            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="complaints" element={<ComplaintsList />} />
              <Route path="complaints/:id" element={<ComplaintDetail />} />
              <Route path="map" element={<MapOverview />} />
              <Route path="dashcam" element={<DashcamDemo />} />
            </Route>

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardShell />
                </ProtectedRoute>
              }
            >
              <Route path={APP_ROUTES.dashboard} element={<DashboardPage />} />
              <Route path={APP_ROUTES.myComplaints} element={<MyComplaintsPage />} />
              <Route path={APP_ROUTES.reportIssue} element={<ReportIssuePage />} />
              <Route path={APP_ROUTES.complaintDetail} element={<ComplaintDetailPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </AuthProvider>
  );
}

export default App;
