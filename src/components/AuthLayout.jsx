import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ResetPasswordForm from './ResetPasswordForm';

const AuthLayout = () => {
  const { user, loading, authEvent } = useAuth();

  if (loading) {
    return <div className="auth-layout"></div>;
  }

  // === [PERBAIKAN LOGIKA DI SINI] ===
  
  // 1. Cek redirect HANYA jika ada user DAN BUKAN event recovery password.
  if (user && authEvent !== 'PASSWORD_RECOVERY') {
    return <Navigate to="/dashboard" replace />;
  }

  // === [AKHIR PERBAIKAN LOGIKA] ===

  // 2. Jika tidak redirect, tampilkan layout otentikasi.
  // Logika di bawah ini akan menangani:
  //    - user adalah null (tampilkan <Outlet> -> Login/Register)
  //    - ATAU authEvent adalah 'PASSWORD_RECOVERY' (tampilkan <ResetPasswordForm />)
  return (
    <div className="auth-layout">
      <div className="auth-sidebar">
        <div className="auth-form-container">
          
          {authEvent === 'PASSWORD_RECOVERY' ? (
            <ResetPasswordForm />
          ) : (
            <Outlet />
          )}

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