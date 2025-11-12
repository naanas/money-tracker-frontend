import React from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import SavingsGoals from '../components/SavingsGoals';
import EmptyState from '../components/EmptyState';

const LoadingSpinner = () => (
  <div className="page-spinner-container" style={{ minHeight: '50vh' }}>
    <div className="page-spinner"></div>
    <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Memuat data...</p>
  </div>
);

const Savings = () => {
  // Ambil data global dari Context
  const { 
    accounts, 
    savingsGoals, 
    loading: dataLoading, 
    refetchAccounts, 
    refetchSavings 
  } = useData();
  
  const { triggerSuccessAnimation } = useAuth();

  // Fungsi update data
  const handleDataUpdate = () => {
    refetchAccounts();
    refetchSavings();
    triggerSuccessAnimation();
  };
  
  const showSkeleton = dataLoading;

  return (
    <>
      <h2>Target Tabungan</h2>
      <p>Rencanakan dan lacak semua target tabungan Anda di sini.</p>
      
      <div className="dashboard-grid savings-layout">
        {showSkeleton ? (
          <LoadingSpinner />
        ) : 
        (accounts.length === 0) ? (
            <EmptyState
              title="Buat Akun Dulu!"
              message="Anda harus memiliki akun (misal: Bank, E-Wallet) sebelum dapat membuat target tabungan."
              actionText="Buat Akun Sekarang"
              actionLink="/accounts"
            />
        ) : (
          <SavingsGoals 
            savingsGoals={savingsGoals} // Gunakan data global
            accounts={accounts} 
            onDataUpdate={handleDataUpdate} 
            isRefetching={false} // Loading dikelola oleh halaman
          />
        )}
      </div> 
    </>
  );
};

export default Savings;