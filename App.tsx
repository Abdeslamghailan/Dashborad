import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ListedIPsProvider } from './contexts/ListedIPsContext';
import { Layout } from './components/Layout';
import { GlobalDashboard } from './components/GlobalDashboard';
import { EntityDashboard } from './components/EntityDashboard';
import { LoginPage } from './components/LoginPage';
import { AdminPanel } from './components/AdminPanel';
import { ProxyPartitionPage } from './components/ProxyPartitionPage';
import { HistoryPage } from './components/HistoryPage';
import { TeamPlanning } from './components/TeamPlanning';
import { SimulationExcel } from './components/SimulationExcel';
import { DashboardReporting } from './components/DashboardReporting';
import { ToolsPage } from './components/ToolsPage';



const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) return null;

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const MailerOrAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isAdmin, isMailer } = useAuth();

  if (isLoading) return null;

  if (!user || (!isAdmin && !isMailer)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Layout>
              <AdminPanel />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/proxy-partition"
        element={
          <MailerOrAdminRoute>
            <Layout>
              <ProxyPartitionPage />
            </Layout>
          </MailerOrAdminRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <GlobalDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/entity/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <EntityDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-planning"
        element={
          <MailerOrAdminRoute>
            <Layout>
              <TeamPlanning />
            </Layout>
          </MailerOrAdminRoute>
        }
      />
      <Route
        path="/history"
        element={
          <AdminRoute>
            <Layout>
              <HistoryPage />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/simulation-excel"
        element={
          <ProtectedRoute>
            <Layout>
              <SimulationExcel />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard-reporting"
        element={
          <MailerOrAdminRoute>
            <Layout>
              <DashboardReporting />
            </Layout>
          </MailerOrAdminRoute>
        }
      />
      <Route
        path="/tools"
        element={
          <ProtectedRoute>
            <Layout>
              <ToolsPage />
            </Layout>
          </ProtectedRoute>
        }
      />


      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <ListedIPsProvider>
          <AppRoutes />
        </ListedIPsProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
