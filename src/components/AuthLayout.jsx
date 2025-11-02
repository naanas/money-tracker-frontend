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
          <Outlet /> {/* Ini akan merender Login.jsx atau Register.jsx */}
        </div>
      </div>
      
      {/* === [PERUBAHAN DI SINI] === */}
      <div className="auth-main-content">
        {/* Tambahkan elemen branding di sisi kanan */}
        <div className="auth-branding">
          <h1>💰 Money Tracker</h1>
          <p>Kendalikan keuangan Anda. Mulai dari langkah kecil.</p>
        </div>
      </div>
      {/* === [AKHIR PERUBAHAN] === */}
    </div>
  );
};

export default AuthLayout;