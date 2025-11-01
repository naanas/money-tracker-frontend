import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatMonthYear } from '../utils/format';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import TransactionForm from '../components/TransactionForm';
import BudgetForm from '../components/BudgetForm';
import CategoryForm from '../components/CategoryForm';
import SavingsGoals from '../components/SavingsGoals'; 

const Dashboard = () => {
  const { user, logout, triggerSuccessAnimation } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allSavingsGoals, setAllSavingsGoals] = useState([]); 
  
  const [isLoading, setIsLoading] = useState(true); 
  const [isRefetching, setIsRefetching] = useState(false); 
  
  const [error, setError] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState(null);
  const isInitialMount = useRef(true); 

  // [DIHAPUS] Kategori yang dikecualikan sekarang ditangani oleh backend
  // const EXCLUDED_CATEGORY = 'Tabungan';

  // === [BLOK PERBAIKAN: DATA FETCHING DIPISAH] ===

  // Fungsi untuk mengambil data bulanan (Analytics + Transaksi)
  const fetchMonthlyData = useCallback(async () => {
    // Tentukan apakah ini load awal atau ganti bulan
    if (isInitialMount.current) {
      setIsLoading(true); // Tampilkan loading besar
      isInitialMount.current = false;
    } else {
      setIsRefetching(true); // Tampilkan loading senyap
    }
    setError('');
    
    const month = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();
    const params = { month, year }; 

    try {
      const [analyticsRes, transactionsRes] = await Promise.all([
        axiosClient.get('/api/analytics/summary', { params }),
        axiosClient.get('/api/transactions', { params }), 
      ]);
      
      setAnalytics(analyticsRes.data.data);
      setTransactions(transactionsRes.data.data.transactions);
      
    } catch (err) {
      console.error("Failed to fetch monthly data:", err);
      setError(err.response?.data?.error || err.message || 'Gagal mengambil data bulanan');
    } finally {
      setIsLoading(false); // Selalu matikan loading besar
      setIsRefetching(false); // Selalu matikan loading senyap
    }
  }, [selectedDate]); // Hanya bergantung pada selectedDate

  // Fungsi untuk mengambil data statis (Kategori + Tabungan)
  const fetchStaticData = useCallback(async () => {
    // Fungsi ini tidak mengatur loading, biarkan fetchMonthlyData yang mengatur
    try {
      const [categoriesRes, savingsRes] = await Promise.all([
        axiosClient.get('/api/categories'),
        axiosClient.get('/api/savings'),
      ]);
      setCategories(categoriesRes.data.data);
      setAllSavingsGoals(savingsRes.data.data);
    } catch (err) {
      console.error("Failed to fetch static data:", err);
      setError(err.response?.data?.error || err.message || 'Gagal mengambil data statis');
    }
  }, []); // Dependensi kosong, hanya dibuat sekali

  // EFEK 1: Ambil data statis SEKALI saat komponen dimuat
  useEffect(() => {
    fetchStaticData();
  }, [fetchStaticData]); // Panggil sekali

  // EFEK 2: Ambil data bulanan saat TANGGAL berubah, atau saat data statis selesai dimuat
  useEffect(() => {
    // Jangan ambil data bulanan jika data statis (kategori) belum siap
    if (categories.length === 0) return;
    
    fetchMonthlyData();
  }, [selectedDate, categories, fetchMonthlyData]); // Berjalan saat ganti bulan / data statis siap

  
  // Fungsi untuk mengambil ulang Kategori (dipanggil oleh handleDataUpdate)
  const refetchCategories = useCallback(async () => {
    try {
      const categoriesRes = await axiosClient.get('/api/categories');
      setCategories(categoriesRes.data.data);
    } catch (err) {
      console.error("Failed to re-fetch categories:", err);
    }
  }, []);

  // Fungsi untuk mengambil ulang Tabungan (dipanggil oleh handleDataUpdate)
  const refetchSavings = useCallback(async () => {
    try {
      const savingsRes = await axiosClient.get('/api/savings');
      setAllSavingsGoals(savingsRes.data.data); 
    } catch (err) {
      console.error("Failed to re-fetch savings:", err);
    }
  }, []);

  // FUNGSI UPDATE (SETELAH SUBMIT FORM)
  const handleDataUpdate = async (options = {}) => {
    // options: { refetchCategories: bool, refetchSavings: bool }

    // Selalu ambil ulang data bulanan
    await fetchMonthlyData(); 
    
    // Ambil ulang data statis HANYA jika diminta
    if (options.refetchCategories) {
      await refetchCategories();
    }
    if (options.refetchSavings) {
      await refetchSavings();
    }
    
    triggerSuccessAnimation(); 
    setBudgetToEdit(null); 
  };

  // === [AKHIR BLOK PERBAIKAN] ===

  const filteredSavingsGoals = useMemo(() => {
    // Logika ini tetap di frontend karena ini murni logika tampilan
    // yang bergantung pada 'selectedDate'
    const goals = allSavingsGoals;
    const selectedMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    
    return goals.filter(goal => {
      if (!goal.target_date) return true;
      const targetDate = new Date(goal.target_date);
      const targetMonthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      if (selectedMonthStart > targetMonthStart) return false;
      if (selectedMonthStart < targetMonthStart) return false; 
      return true; 
    });
  }, [allSavingsGoals, selectedDate]);

  const totalSavingsCurrent = useMemo(() => {
    return filteredSavingsGoals.reduce((sum, goal) => sum + parseFloat(goal.current_amount), 0);
  }, [filteredSavingsGoals]);

  const handlePrevMonth = () => {
    setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
  };

  const handleDeleteBudget = async (e, budgetId) => {
    e.stopPropagation(); 
    if (!window.confirm('Yakin ingin menghapus budget pocket ini?\n\n(Ini tidak akan menghapus transaksi Anda yang sudah ada.)')) return;
    setError('');
    setIsRefetching(true); // Gunakan isRefetching untuk loading senyap
    try {
      await axiosClient.delete(`/api/budgets/${budgetId}`);
      handleDataUpdate(); // Panggil update
    } catch (err) {
      console.error("Failed to delete budget:", err);
      setError(err.response?.data?.error || err.message || 'Gagal menghapus budget');
      setIsRefetching(false);
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Yakin ingin menghapus transaksi ini?')) return;
    setError('');
    setIsRefetching(true);
    try {
      await axiosClient.delete(`/api/transactions/${transactionId}`);
      handleDataUpdate(); // Panggil update
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      setError(err.response?.data?.error || err.message || 'Gagal menghapus transaksi');
      setIsRefetching(false);
    }
  };

  const handleResetTransactions = async () => {
    setError('');
    const pass = prompt('Ini akan MENGHAPUS SEMUA data transaksi Anda.\nKetik "RESET" untuk konfirmasi:');
    if (pass !== 'RESET') {
      alert('Reset dibatalkan.');
      return;
    }
    setIsRefetching(true); 
    try {
      await axiosClient.delete('/api/transactions/reset');
      handleDataUpdate({ refetchSavings: true }); // Reset juga data tabungan
    } catch (err) {
      console.error("Failed to reset transactions:", err);
      setError(err.response?.data?.error || err.message || 'Gagal mereset transaksi');
      setIsRefetching(false); 
    }
  };
  
  // [PERBAIKAN] Logika budgetPockets disederhanakan.
  // Tidak perlu filter 'EXCLUDED_CATEGORY' lagi.
  const budgetPockets = useMemo(() => {
    if (!analytics) return [];
    
    const budgetDetails = analytics.budget?.details || [];
    const expenses = analytics.expenses_by_category || {};
    
    // 1. Ambil budget yang sudah di-set
    const pockets = budgetDetails.map(budget => {
      const spent = expenses[budget.category_name] || 0;
      return {
        ...budget,
        spent: spent,
        remaining: budget.amount - spent,
        progress: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
      };
    });
    
    // 2. Tambahkan kategori yang punya pengeluaran tapi TIDAK di-budget
    const existingBudgetNames = new Set(pockets.map(p => p.category_name));
    
    Object.keys(expenses).forEach(categoryName => {
      if (!existingBudgetNames.has(categoryName)) { 
        pockets.push({
          id: `virtual-${categoryName}`, 
          category_name: categoryName,
          amount: 0, 
          spent: expenses[categoryName],
          remaining: -expenses[categoryName],
          progress: 100 
        });
      }
    });

    return pockets;
  }, [analytics]);

  // [PERBAIKAN] Logika ringkasan disederhanakan.
  // Data dari 'analytics' sudah bersih (tidak termasuk tabungan).
  const totalIncome = analytics?.summary?.total_income || 0;
  const totalExpensesFiltered = analytics?.summary?.total_expenses || 0;
  const totalTransferredToSavings = analytics?.summary?.total_transferred_to_savings || 0;

  const totalBudget = analytics?.budget?.total_amount || 0;
  const totalSpent = totalExpensesFiltered;
  const totalRemaining = totalBudget - totalSpent; 
  const totalProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  const currentBalance = totalIncome - totalSpent;


  return (
    <>
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1>💰 Money Tracker</h1>
          </div>
          <div className="sidebar-footer">
            <div className="user-info">{user?.email}</div>
            <button onClick={logout} className="logout-btn">
              Logout
            </button>
            <button onClick={handleResetTransactions} className="btn-reset-sidebar">
              Reset Semua Transaksi
            </button>
          </div>
        </aside>

        <main className="main-content">
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
          </header>

          <div className="month-navigator">
            <button onClick={handlePrevMonth} disabled={isRefetching}>&lt;</button>
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              dateFormat="MMMM yyyy"
              showMonthYearPicker
              showFullMonthYearPicker
              className="month-picker-input"
              popperPlacement="bottom"
              disabled={isRefetching}
            />
            <button onClick={handleNextMonth} disabled={isRefetching}>&gt;</button>
          </div>
          
          {error && <p className="error" style={{textAlign: 'center', padding: '1rem', backgroundColor: 'var(--color-bg-medium)', borderRadius: '12px'}}>{error}</p>}

          {isLoading ? (
            <div className="loading-content">
               {/* Halaman kosong saat loading awal */}
            </div>
          ) : (
            analytics ? (
              <div className="dashboard-grid" style={{ opacity: isRefetching ? 0.8 : 1, transition: 'opacity 0.3s' }}>
                
                <> 
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
                    
                    {/* [PERBAIKAN] Gunakan data `totalTransferredToSavings` dari backend */}
                    <div className="summary-item">
                      <span>Dana Ditabung</span>
                      <span className="income">{formatCurrency(totalTransferredToSavings)}</span>
                    </div>

                    <div className="summary-item total-savings">
                      <span>Total Dana Tabungan (Bulan Ini)</span>
                      <span className="income">{formatCurrency(totalSavingsCurrent)}</span>
                    </div>
                    
                    <hr />
                    <div className="summary-item total">
                      <span>Saldo</span>
                      <span>{formatCurrency(currentBalance)}</span>
                    </div>
                  </section>

                  <section className="card card-budget-pocket">
                    <h3>Budget Pockets</h3>
                    <div className="budget-info total">
                      <span>Total Budget: {formatCurrency(totalBudget)}</span>
                      <span>{totalProgress.toFixed(0)}%</span>
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${Math.min(totalProgress, 100)}%`,
                          backgroundColor: totalRemaining < 0 ? 'var(--color-accent-expense)' : 'var(--color-primary)'
                        }} 
                      ></div>
                    </div>
                    <div className="pocket-footer" style={{marginTop: '0.25rem'}}>
                        <span className="expense">{formatCurrency(totalSpent)}</span>
                        <span className="total"> / {formatCurrency(totalBudget)}</span>
                    </div>
                    
                    <BudgetForm 
                      categories={categories} 
                      onBudgetSet={handleDataUpdate} // [PERBAIKAN] Panggil fungsi standar
                      budgetToEdit={budgetToEdit}
                      onClearEdit={() => setBudgetToEdit(null)}
                      selectedDate={selectedDate} 
                      isRefetching={isRefetching} 
                    />

                    <div className="pocket-grid">
                      {budgetPockets.length > 0 ? (
                        budgetPockets.map(pocket => (
                          <div 
                            className="pocket-item" 
                            key={pocket.id || pocket.category_name} 
                            onClick={() => pocket.id.startsWith('virtual-') ? null : setBudgetToEdit(pocket)}
                            title={pocket.id.startsWith('virtual-') ? "Kategori ini tidak di-budget" : "Klik untuk edit"}
                          >
                            {!pocket.id.startsWith('virtual-') && (
                              <button 
                                className="pocket-delete-btn"
                                onClick={(e) => handleDeleteBudget(e, pocket.id)}
                                title="Hapus Budget Ini"
                              >
                                ✕
                              </button>
                            )}
                            <div className="pocket-header">
                              <span className="pocket-title">{pocket.category_name}</span>
                              <span className={`pocket-remaining ${pocket.remaining < 0 ? 'expense' : ''}`}>
                                {pocket.remaining < 0 ? 'Over!' : `${formatCurrency(pocket.remaining)} sisa`}
                              </span>
                            </div>
                            <div className="progress-bar-container small">
                              <div 
                                className={`progress-bar-fill ${pocket.progress > 100 ? 'expense' : ''}`}
                                style={{ width: `${Math.min(pocket.progress, 100)}%` }}
                              ></div>
                            </div>
                            <div className="pocket-footer">
                              <span className="expense">{formatCurrency(pocket.spent)}</span>
                              <span className="total"> / {formatCurrency(pocket.amount)}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p style={{textAlign: 'center', fontSize: '0.9em', color: 'var(--color-text-muted)', gridColumn: '1 / -1'}}>
                          Belum ada budget per kategori.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="card card-form">
                    <h3>Tambah Transaksi Baru</h3>
                    <TransactionForm 
                      categories={categories} 
                      onTransactionAdded={handleDataUpdate} // [PERBAIKAN] Panggil fungsi standar
                      onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
                      selectedDate={selectedDate}
                      isRefetching={isRefetching} 
                    />
                  </section>
                  
                  <SavingsGoals 
                    savingsGoals={filteredSavingsGoals} 
                    // [PERBAIKAN] Kirim opsi untuk refetch data tabungan
                    onDataUpdate={() => handleDataUpdate({ refetchSavings: true })}
                    isRefetching={isRefetching}
                  />

                  <section className="card card-list full-height-card">
                    <h3>Transaksi {formatMonthYear(selectedDate)}</h3>
                    <ul>
                      {/* [PERBAIKAN] Logika filter 'Tabungan' dihapus dari sini */}
                      {transactions.length > 0 ? (
                        transactions.map((t) => (
                          <li key={t.id} className="list-item">
                            <button 
                              className="btn-delete-item"
                              title="Hapus transaksi ini"
                              onClick={() => handleDeleteTransaction(t.id)}
                            >
                              ✕
                            </button>
                            <div className="list-item-details">
                              <strong>{t.description || t.category}</strong>
                              <span>{new Date(t.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}</span>
                            </div>
                            <span className={t.type}>
                              {t.type === 'expense' ? '-' : '+'}
                              {formatCurrency(t.amount)}
                            </span>
                          </li>
                        ))
                      ) : (
                        <p>Belum ada transaksi di bulan ini.</p>
                      )}
                    </ul>
                  </section>

                  {analytics && (
                    <section className="card card-list">
                      <h3>Pengeluaran per Kategori</h3>
                      <ul>
                        {/* [PERBAIKAN] Logika filter 'Tabungan' dihapus dari sini */}
                        {Object.keys(analytics.expenses_by_category).length > 0 ? (
                            Object.entries(analytics.expenses_by_category)
                                .map(([category, amount]) => (
                                    <li key={category} className="list-item">
                                        <span>{category}</span>
                                        <span className="expense">-{formatCurrency(amount)}</span>
                                    </li>
                                ))
                          ) : (
                            <p>Belum ada pengeluaran.</p>
                          )}
                      </ul>
                    </section>
                  )}
                </>
              </div>
            ) : (
              !isLoading && error && (
                <div style={{textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem'}}>
                  <p>Tidak dapat memuat data. Silakan coba lagi.</p>
                  <p><i>{error}</i></p>
                </div>
              )
            )
          )}
        </main>
      </div>

      {isCategoryModalOpen && (
        <CategoryForm 
          existingCategories={categories}
          onClose={() => setIsCategoryModalOpen(false)}
          // [PERBAIKAN] Kirim opsi untuk refetch data kategori
          onSuccess={() => handleDataUpdate({ refetchCategories: true })} 
        />
      )}
    </>
  );
};

export default Dashboard;