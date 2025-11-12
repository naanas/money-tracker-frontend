import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';
import ThemeToggle from './ThemeToggle';
// [BARU] Impor modal dan hook data baru
import AddTransactionModal from './AddTransactionModal';
import { useData } from '../contexts/DataContext';

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
        {/* === [NAVIGASI DIPERBARUI] === */}
        <Link 
          to="/dashboard" 
          className={currentPath === '/' || currentPath === '/dashboard' ? 'active' : ''}
        >
          Ringkasan
        </Link>
        <Link 
          to="/accounts" 
          className={currentPath === '/accounts' ? 'active' : ''}
        >
          Akun
        </Link>
        <Link 
          to="/budget" 
          className={currentPath === '/budget' ? 'active' : ''}
        >
          Budget
        </Link>
        <Link 
          to="/savings" 
          className={currentPath === '/savings' ? 'active' : ''}
        >
          Tabungan
        </Link>
        <Link 
          to="/reports" 
          className={currentPath === '/reports' ? 'active' : ''}
        >
          Laporan
        </Link>
        {/* === [AKHIR NAVIGASI DIPERBARUI] === */}
      </nav>

      <div className="sidebar-footer">
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
  
  // [BARU] State untuk mengontrol menu dropdown mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // [BARU] State untuk FAB modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // [BARU] Ambil data dari context untuk modal
  const { categories, accounts, refetchCategories, refetchAccounts, refetchSavings } = useData();
  const { triggerSuccessAnimation } = useAuth();

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

  const handleMobileMenuReset = () => {
    handleResetTransactions();
    setIsMobileMenuOpen(false);
  };
  
  const handleMobileMenuLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  // [BARU] Fungsi handler setelah modal ditutup
  const onModalSuccess = () => {
    setIsAddModalOpen(false);
    triggerSuccessAnimation();
    // Panggil refetch yang relevan
    refetchAccounts();
    refetchSavings(); 
  };

  return (
    <div className="dashboard-layout">
      <Sidebar 
        onLogout={logout} 
        onReset={handleResetTransactions} 
        isResetting={isResetting} 
      />
      
      <main className="main-content" onClick={() => setIsMobileMenuOpen(false)}>
        <header className="mobile-header">
            <h1>💰 Money Tracker</h1>
            
            <div>
              <div className="mobile-menu-container">
                <button 
                  className="mobile-menu-toggle" 
                  onClick={(e) => {
                    e.stopPropagation(); 
                    setIsMobileMenuOpen(!isMobileMenuOpen);
                  }}
                  title="Menu Opsi"
                >
                  ⋮ 
                </button>
                
                {isMobileMenuOpen && (
                  <div className="mobile-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                    <div className="mobile-menu-item">
                      <span>Ganti Tema</span>
                      <ThemeToggle />
                    </div>
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
            
            {/* === [NAVIGASI MOBILE DIPERBARUI] === */}
            <nav className="mobile-nav">
                <Link to="/dashboard">Ringkasan</Link>
                <Link to="/accounts">Akun</Link>
                <Link to="/budget">Budget</Link>
                <Link to="/savings">Tabungan</Link>
                <Link to="/reports">Laporan</Link>
            </nav>
            {/* === [AKHIR NAVIGASI MOBILE] === */}
        </header>

        <Outlet />
      </main>

      {/* === [FAB (FLOATING ACTION BUTTON) BARU] === */}
      <button 
        className="fab" 
        onClick={() => setIsAddModalOpen(true)}
        title="Tambah Transaksi/Transfer"
      >
        +
      </button>

      {/* === [MODAL TRANSAKSI BARU] === */}
      {isAddModalOpen && (
        <AddTransactionModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          categories={categories}
          accounts={accounts}
          onSuccess={onModalSuccess}
          onRefetchCategories={refetchCategories}
        />
      )}
    </div>
  );
};

export default MainLayout;