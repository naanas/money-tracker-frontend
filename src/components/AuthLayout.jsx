import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    // Tampilkan layar loading kosong selagi mengecek auth
    return <div className="auth-layout"></div>;
  }

  if (user) {
    // Jika user sudah login, redirect ke Dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // Jika belum login, tampilkan layout sidebar form
  // dan render halaman (Login atau Register) di dalamnya
  return (
    <div className="auth-layout">
      <div className="auth-sidebar">
        <div className="auth-form-container">
          <Outlet />
        </div>
      </div>
      <div className="auth-main-content">
        {/* Biarkan kosong agar gelap seperti di screenshot */}
      </div>
    </div>
  );
};

export default AuthLayout;