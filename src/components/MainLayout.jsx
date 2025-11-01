import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';

// [BARU] Pisahkan Sidebar agar bisa dipakai ulang
const Sidebar = ({ onLogout, onReset }) => {
  const { user } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>💰 Money Tracker</h1>
      </div>
      
      {/* [BARU] Navigasi Utama */}
      <nav className="sidebar-nav">
        <Link 
          to="/dashboard" 
          className={currentPath === '/' || currentPath === '/dashboard' ? 'active' : ''}
        >
          Dashboard
        </Link>
        <Link 
          to="/accounts" 
          className={currentPath === '/accounts' ? 'active' : ''}
        >
          Akun Saya
        </Link>
        <Link 
          to="/reports" 
          className={currentPath === '/reports' ? 'active' : ''}
        >
          Laporan
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">{user?.email}</div>
        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>
        <button onClick={onReset} className="btn-reset-sidebar">
          Reset Semua Transaksi
        </button>
      </div>
    </aside>
  );
};

// [BARU] Layout Utama
const MainLayout = () => {
  const { logout } = useAuth();
  const [isResetting, setIsResetting] = useState(false);

  const handleResetTransactions = async () => {
    const pass = prompt('Ini akan MENGHAPUS SEMUA data transaksi DAN progress tabungan Anda.\nKetik "RESET" untuk konfirmasi:');
    if (pass !== 'RESET') {
      alert('Reset dibatalkan.');
      return;
    }
    setIsResetting(true); 
    try {
      await axiosClient.delete('/api/transactions/reset');
      alert('Reset berhasil! Halaman akan dimuat ulang.');
      window.location.reload(); // Reload untuk reset state
    } catch (err) {
      console.error("Failed to reset transactions:", err);
      alert(err.response?.data?.error || err.message || 'Gagal mereset transaksi');
    }
    setIsResetting(false); 
  };

  return (
    <div className="dashboard-layout">
      {/* Kirim props ke Sidebar */}
      <Sidebar 
        onLogout={logout} 
        onReset={handleResetTransactions} 
        isResetting={isResetting} 
      />
      
      {/* Konten Halaman (Dashboard, Accounts, Reports) */}
      <main className="main-content">
        {/* Header Mobile (bisa dipindah ke sini dari Dashboard.jsx) */}
        <header className="mobile-header">
            <h1>💰 Money Tracker</h1>
            <div>
              <button onClick={handleResetTransactions} className="btn-reset-mobile" title="Reset All Data">
                Reset
              </button>
              <button onClick={logout} className="logout-btn-mobile">
                Logout
              </button>
            </div>
            {/* [BARU] Navigasi Mobile */}
            <nav className="mobile-nav">
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/accounts">Akun</Link>
                <Link to="/reports">Laporan</Link>
            </nav>
        </header>

        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;