import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatMonthYear } from '../utils/format';
import { useData } from '../contexts/DataContext';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import AccountSummary from '../components/AccountSummary'; 
import TransactionDetailModal from '../components/TransactionDetailModal';
import EditTransactionModal from '../components/EditTransactionModal'; // [BARU] Import Modal Edit
import EmptyState from '../components/EmptyState';

const LoadingSpinner = () => (
  <div className="page-spinner-container" style={{ minHeight: '50vh' }}>
    <div className="page-spinner"></div>
    <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Memuat data...</p>
  </div>
);

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // State Data Bulanan
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  
  // Ambil data global dari Context
  const { 
    accounts, 
    categories, 
    loading: dataLoading, 
    refetchAccounts, 
    refetchSavings,
    refetchCategories // [BARU] Diperlukan untuk modal edit (jika tambah kategori)
  } = useData();
  
  // State UI
  const [isLoading, setIsLoading] = useState(true); 
  const [isRefetching, setIsRefetching] = useState(false); 
  const [error, setError] = useState('');
  
  // State Modal Detail
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  
  // [BARU] State Modal Edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);

  const [animationClass, setAnimationClass] = useState('');

  // --- Fungsi Data Fetching ---
  const fetchMonthlyData = useCallback(async (isRefetch = false) => {
    if (isRefetch) {
      setIsRefetching(true);
    } else {
      setIsLoading(true);
    }
    setError('');
    
    const month = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();
    const params = { month, year }; 

    // Jangan fetch jika data statis (akun/kategori) belum ada
    if (accounts.length === 0 || categories.length === 0) {
      if (!dataLoading) { 
         setAnalytics(null);
         setTransactions([]);
      }
      setIsLoading(false);
      setIsRefetching(false);
      return; 
    }

    try {
      const [analyticsRes, transactionsRes] = await Promise.all([
        axiosClient.get('/api/analytics/summary', { params }),
        axiosClient.get('/api/transactions', { params }), 
      ]);
      setAnalytics(analyticsRes.data.data);
      setTransactions(transactionsRes.data.data.transactions);
    } catch (err) {
      console.error("Failed to fetch monthly data:", err);
      setError(err.response?.data?.error || 'Gagal mengambil data bulanan');
    } finally {
      setIsLoading(false); 
      setIsRefetching(false);
    }
  }, [selectedDate, accounts, categories, dataLoading]); 

  // Efek untuk memuat data bulanan saat halaman dibuka atau data konteks berubah
  useEffect(() => {
    if (!dataLoading) {
      fetchMonthlyData(false); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoading, fetchMonthlyData]); 

  // Efek untuk refetch saat tanggal berubah
  useEffect(() => {
    if (!dataLoading) {
        fetchMonthlyData(true);
    }
  }, [selectedDate, dataLoading]);

  // Fungsi update data
  const handleDataUpdate = async () => {
    if (accounts.length > 0 && categories.length > 0) {
      await fetchMonthlyData(true); 
    }
    refetchAccounts();
    refetchSavings();
  };

  // --- [BARU] Handlers Edit ---
  const handleEditClick = (transaction) => {
    setTransactionToEdit(transaction); // Simpan data yang mau diedit
    setSelectedTransaction(null);      // Tutup modal detail
    setIsEditModalOpen(true);          // Buka modal edit
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setTransactionToEdit(null);
    handleDataUpdate(); // Refresh semua data dashboard
    alert("Transaksi berhasil diperbarui!"); 
  };
  // -----------------------------

  // --- Memos ---
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + parseFloat(acc.current_balance), 0);
  }, [accounts]);

  // --- Variabel Ringkasan ---
  const totalIncome = analytics?.summary?.total_income || 0;
  const totalExpensesFiltered = analytics?.summary?.total_expenses || 0;
  const totalTransferredToSavings = analytics?.summary?.total_transferred_to_savings || 0;
  const currentBalance = totalIncome - totalExpensesFiltered; 

  // --- Handlers UI ---
  const handlePrevMonth = () => {
    if (isRefetching || animationClass || isLoading) return; 
    setAnimationClass('slide-in-right');
    setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    if (isRefetching || animationClass || isLoading) return; 
    setAnimationClass('slide-in-left');
    setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Yakin ingin menghapus transaksi ini?')) return;
    setError('');
    setIsRefetching(true); 
    try {
      await axiosClient.delete(`/api/transactions/${transactionId}`);
      handleDataUpdate(); 
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menghapus transaksi');
      setIsRefetching(false);
    }
  };
  
  const showSkeleton = isLoading || dataLoading;

  return (
    <>
      <div className="month-navigator">
        <button onClick={handlePrevMonth} disabled={isRefetching || !!animationClass || isLoading}>&lt;</button>
        <DatePicker
          selected={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          dateFormat="MMMM yyyy"
          showMonthYearPicker
          showFullMonthYearPicker
          className="month-picker-input"
          popperPlacement="bottom"
          disabled={isRefetching || !!animationClass || isLoading}
        />
        <button onClick={handleNextMonth} disabled={isRefetching || !!animationClass || isLoading}>&gt;</button>
      </div>
      
      <div className="dashboard-content-wrapper">
        {showSkeleton ? (
          <LoadingSpinner />
        ) : 
        (error) ? (
          <div className="card" style={{textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem'}}>
            <p>Tidak dapat memuat data. Silakan coba lagi.</p>
            <p><i>{error}</i></p>
          </div>
        ) :
        (accounts.length === 0) ? (
          <EmptyState
            title="Selamat Datang! 🎉"
            message="Anda belum memiliki akun. Akun adalah tempat Anda menyimpan uang (misal: Bank, E-Wallet, atau Tunai). Silakan buat akun pertama Anda untuk memulai."
            actionText="Buat Akun Pertama"
            actionLink="/accounts"
          />
        ) :
        (
          <div 
            className={`dashboard-grid summary-layout ${animationClass}`}
            onAnimationEnd={() => setAnimationClass('')} 
          >
            
            {/* --- SUMMARY SECTION --- */}
            {analytics ? (
              <section className="card card-summary">
                <h3>Ringkasan {formatMonthYear(selectedDate)}</h3>
                <div className="summary-item">
                  <span>Total Pemasukan</span>
                  <span className="income">{formatCurrency(totalIncome)}</span>
                </div>
                <div className="summary-item">
                  <span>Total Pengeluaran</span>
                  <span className="expense">{formatCurrency(totalExpensesFiltered)}</span>
                </div>
                <div className="summary-item">
                  <span>Dana Ditabung</span>
                  <span className="income">{formatCurrency(totalTransferredToSavings)}</span>
                </div>
                <hr />
                <div className="summary-item total">
                  <span>Sisa Uang (Bulan Ini)</span>
                  <span>{formatCurrency(currentBalance)}</span>
                </div>
                <div className="summary-item total" style={{fontSize: "1.2em", marginTop: "0.5rem"}}>
                  <span>Total Saldo (Semua Akun)</span>
                  <span>{formatCurrency(totalBalance)}</span>
                </div>
              </section>
            ) : <p>Tidak ada data ringkasan.</p>}

            <AccountSummary accounts={accounts} />

            {/* --- LIST TRANSAKSI --- */}
            <section className="card card-list full-height-card">
              <h3>Transaksi {formatMonthYear(selectedDate)}</h3>
              <ul>
                {transactions.length > 0 ? (
                  transactions.map((t) => (
                    <li key={t.id} className="list-item">
                      <button 
                        className="btn-delete-item"
                        title="Hapus transaksi ini"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTransaction(t.id);
                        }}
                      >
                        ✕
                      </button>
                      
                      <div 
                        className="list-item-clickable-area" 
                        onClick={() => setSelectedTransaction(t)}
                        title="Lihat Detail"
                      >
                        <div className="list-item-details">
                          <strong>{t.description || t.category}</strong>
                          <span>
                            {new Date(t.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'})}
                            {t.accounts ? ` • ${t.accounts.name}` : ''}
                          </span>
                        </div>
                        <span className={t.type}>
                          {t.type === 'expense' ? '-' : '+'}
                          {formatCurrency(t.amount)}
                        </span>
                      </div>
                    </li>
                  ))
                ) : (
                  <EmptyState 
                    title="Tidak Ada Transaksi"
                    message="Belum ada transaksi yang tercatat di bulan ini."
                  />
                )}
              </ul>
            </section>
          </div>
        )
        
        }
      </div> 

      {/* [MODIFIKASI] Modal Detail Transaksi dengan prop onEdit */}
      {selectedTransaction && (
        <TransactionDetailModal 
          transaction={selectedTransaction} 
          onClose={() => setSelectedTransaction(null)}
          onEdit={handleEditClick} // Pasang handler edit di sini
        />
      )}

      {/* [BARU] Modal Edit Transaksi */}
      {isEditModalOpen && (
        <EditTransactionModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            transaction={transactionToEdit}
            categories={categories}
            accounts={accounts}
            onSuccess={handleEditSuccess}
            onRefetchCategories={refetchCategories}
        />
      )}

    </>
  );
};

export default Dashboard;