import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (user) {
    // Jika user sudah login, redirect ke Dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // Jika belum login, tampilkan halaman (Login atau Register)
  return <Outlet />;
};

export default AuthLayout;