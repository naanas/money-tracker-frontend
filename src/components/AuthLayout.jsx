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

  // === [MODIFIKASI] Layout diubah menjadi satu kolom terpusat ===
  return (
    <div className="auth-layout">
      <div className="auth-container">
        
        {/* 1. Branding dipindah ke atas */}
        <div className="auth-branding-top">
          <h1>💰 Money Tracker</h1>
          <p>Kendalikan keuangan Anda. Mulai dari langkah kecil.</p>
        </div>
        
        {/* 2. Form (Login/Register) di dalam card */}
        <div className="auth-card">
          <Outlet /> {/* Ini akan merender Login.jsx atau Register.jsx */}
        </div>
      
      </div>
    </div>
  );
  // === [AKHIR MODIFIKASI] ===
};

export default AuthLayout;