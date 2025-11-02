import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// [BARU] Impor form reset password
import ResetPasswordForm from './ResetPasswordForm';

const AuthLayout = () => {
  // [MODIFIKASI] Ambil 'authEvent' dari context
  const { user, loading, authEvent } = useAuth();

  if (loading) {
    return <div className="auth-layout"></div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="auth-layout">
      <div className="auth-sidebar">
        <div className="auth-form-container">
          
          {/* === [PERUBAHAN DI SINI] === */}
          {/* Jika event-nya adalah PASSWORD_RECOVERY, tampilkan form reset */}
          {authEvent === 'PASSWORD_RECOVERY' ? (
            <ResetPasswordForm />
          ) : (
            /* Jika tidak, tampilkan <Outlet> (Login.jsx atau Register.jsx) */
            <Outlet />
          )}
          {/* === [AKHIR PERUBAHAN] === */}

        </div>
      </div>
      <div className="auth-main-content">
        <div className="auth-branding">
          <h1>💰 Money Tracker</h1>
          <p>Kendalikan keuangan Anda. Mulai dari langkah kecil.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;