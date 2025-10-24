import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StudentVerification from './pages/StudentVerification';
import VendorDashboard from './pages/VendorDashboard';
import AdminPanel from './pages/AdminPanel';
import StudentList from './pages/StudentList';
import MyQRCode from './pages/MyQRCode';
import LoadingSpinner from './components/LoadingSpinner';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { isAuthenticated, hasAnyRole, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/register" 
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } 
            />

            {/* Protected Routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route 
                path="verification" 
                element={
                  <ProtectedRoute requiredRoles={['vendor', 'admin']}>
                    <StudentVerification />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="vendor-dashboard" 
                element={
                  <ProtectedRoute requiredRoles={['vendor', 'admin']}>
                    <VendorDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="admin" 
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <AdminPanel />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="students" 
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <StudentList />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="my-qr-code" 
                element={
                  <ProtectedRoute requiredRoles={['student']}>
                    <MyQRCode />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
