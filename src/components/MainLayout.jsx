import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';
import ThemeToggle from './ThemeToggle';

// Pisahkan Sidebar agar bisa dipakai ulang
const Sidebar = ({ onLogout, onReset }) => {
  const { user } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>💰 Money Tracker</h1>
      </div>
      
      <nav className="sidebar-nav">
        {/* ... (Link navigasi tidak berubah) ... */}
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
        {/* Toggle ini untuk Desktop */}
        <ThemeToggle /> 
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

// Layout Utama
const MainLayout = () => {
  const { logout } = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  
  // === [STATE BARU] ===
  // State untuk mengontrol menu dropdown mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // === [AKHIR STATE BARU] ===

  const handleResetTransactions = async () => {
    // ... (Fungsi ini tidak berubah) ...
    const pass = prompt('Ini akan MENGHAPUS SEMUA data transaksi DAN progress tabungan Anda.\nKetik "RESET" untuk konfirmasi:');
    if (pass !== 'RESET') {
      alert('Reset dibatalkan.');
      return;
    }
    setIsResetting(true); 
    try {
      await axiosClient.delete('/api/transactions/reset');
      alert('Reset berhasil! Halaman akan dimuat ulang.');
      window.location.reload(); 
    } catch (err) {
      console.error("Failed to reset transactions:", err);
      alert(err.response?.data?.error || err.message || 'Gagal mereset transaksi');
    }
    setIsResetting(false); 
  };

  // === [FUNGSI BARU] ===
  // Wrapper untuk handle reset dari dropdown
  const handleMobileMenuReset = () => {
    handleResetTransactions();
    setIsMobileMenuOpen(false);
  };
  
  // Wrapper untuk handle logout dari dropdown
  const handleMobileMenuLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };
  // === [AKHIR FUNGSI BARU] ===

  return (
    <div className="dashboard-layout">
      <Sidebar 
        onLogout={logout} 
        onReset={handleResetTransactions} 
        isResetting={isResetting} 
      />
      
      {/* [MODIFIKASI] Tambah onClick di main-content untuk menutup dropdown */}
      <main className="main-content" onClick={() => setIsMobileMenuOpen(false)}>
        <header className="mobile-header">
            <h1>💰 Money Tracker</h1>
            
            {/* === [MODIFIKASI] Blok Tombol Mobile === */}
            <div>
              {/* Tombol-tombol lama dihapus */}
              {/* <button onClick={handleResetTransactions} ...>Reset</button> */}
              {/* <button onClick={logout} ...>Logout</button> */}

              {/* [BARU] Container Dropdown Menu */}
              <div className="mobile-menu-container">
                <button 
                  className="mobile-menu-toggle" 
                  onClick={(e) => {
                    e.stopPropagation(); // Mencegah main-content onClick
                    setIsMobileMenuOpen(!isMobileMenuOpen);
                  }}
                  title="Menu Opsi"
                >
                  ⋮ 
                </button>
                
                {isMobileMenuOpen && (
                  <div className="mobile-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                    <button onClick={handleMobileMenuReset} className="menu-item-reset">
                      Reset Semua Data
                    </button>
                    <button onClick={handleMobileMenuLogout}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* === [AKHIR MODIFIKASI] === */}
            
            <nav className="mobile-nav">
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/accounts">Akun</Link>
                <Link to="/reports">Laporan</Link>
            </nav>
        </header>

        {/* Toggle ini untuk FAB di kanan bawah */}
        <ThemeToggle />

        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;