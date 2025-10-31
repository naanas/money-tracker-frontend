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
  const [allSavingsGoals, setAllSavingsGoals] = useState([]); // Menyimpan semua goals
  
  const [isLoading, setIsLoading] = useState(true); 
  const [isRefetching, setIsRefetching] = useState(false); 
  
  const [error, setError] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState(null);
  const isInitialMount = useRef(true); 

  // FUNGSI UNTUK MENGAMBIL KATEGORI SECARA TERPISAH
  const fetchCategories = useCallback(async () => {
    try {
      const categoriesRes = await axiosClient.get('/api/categories');
      setCategories(categoriesRes.data.data);
    } catch (err) {
      console.error("Failed to re-fetch categories:", err);
    }
  }, []);

  // Fungsi untuk mengambil data bulanan + data tabungan
  const fetchDataForMonth = useCallback(async () => {
    setIsRefetching(true); 
    setError('');
    
    const month = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();
    const params = { month, year }; 

    try {
      // Fetch analytics dan transactions yang tergantung bulan
      const [analyticsRes, transactionsRes] = await Promise.all([
        axiosClient.get('/api/analytics/summary', { params }),
        axiosClient.get('/api/transactions', { params }), 
      ]);
      
      // Fetch semua savings goals (tidak tergantung bulan)
      const savingsRes = await axiosClient.get('/api/savings');

      setAnalytics(analyticsRes.data.data);
      setTransactions(transactionsRes.data.data.transactions);
      setAllSavingsGoals(savingsRes.data.data); 
      
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err.response?.data?.error || err.message || 'Gagal mengambil data dashboard');
    } finally {
      setIsRefetching(false);
    }
  }, [selectedDate]); 

  // EFEK UNTUK LOAD AWAL 
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true); 
      setError('');
      
      const month = selectedDate.getMonth() + 1;
      const year = selectedDate.getFullYear();
      const params = { month, year }; 

      try {
        const [categoriesRes, analyticsRes, transactionsRes, savingsRes] = await Promise.all([
          axiosClient.get('/api/categories'),
          axiosClient.get('/api/analytics/summary', { params }),
          axiosClient.get('/api/transactions', { params }), 
          axiosClient.get('/api/savings'),
        ]);

        setCategories(categoriesRes.data.data);
        setAnalytics(analyticsRes.data.data);
        setTransactions(transactionsRes.data.data.transactions);
        setAllSavingsGoals(savingsRes.data.data); 
        
      } catch (err) {
        console.error("Failed to fetch initial dashboard data:", err);
        setError(err.response?.data?.error || err.message || 'Gagal mengambil data dashboard');
      } finally {
        setIsLoading(false); 
      }
    };
    
    fetchInitialData();
  }, []); 

  // EFEK UNTUK GANTI BULAN
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      fetchDataForMonth();
    }
  }, [selectedDate, fetchDataForMonth]); 

  // FUNGSI UPDATE (SETELAH SUBMIT FORM)
  const handleDataUpdate = async () => {
    // Jalankan refresh data tanpa menampilkan loading overlay
    await fetchDataForMonth(); 
    await fetchCategories();
    
    triggerSuccessAnimation(); 
    setBudgetToEdit(null); 
  };

  // [MODIFIKASI] Total Savings hanya dari goals yang ditampilkan di bulan ini
  const totalSavingsCurrent = useMemo(() => {
    return filteredSavingsGoals.reduce((sum, goal) => sum + parseFloat(goal.current_amount), 0);
  }, [filteredSavingsGoals]); // Dependency diubah

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
    setIsRefetching(true);
    try {
      await axiosClient.delete(`/api/budgets/${budgetId}`);
      handleDataUpdate(); 
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
      handleDataUpdate(); 
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
      handleDataUpdate(); 
    } catch (err) {
      console.error("Failed to reset transactions:", err);
      setError(err.response?.data?.error || err.message || 'Gagal mereset transaksi');
      setIsRefetching(false); 
    }
  };
  
  // [LOGIKA FILTERING SAVINGS GOALS SESUAI PERMINTAAN]
  const filteredSavingsGoals = useMemo(() => {
    const goals = allSavingsGoals;

    // Ambil tanggal awal bulan yang dipilih
    const selectedMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    
    return goals.filter(goal => {
      // 1. Goals tanpa target_date (ongoing) selalu ditampilkan
      if (!goal.target_date) return true;
      
      const targetDate = new Date(goal.target_date);
      // Buat tanggal yang hanya berisi bulan dan tahun target (set ke awal bulan target)
      const targetMonthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);

      // Cek apakah bulan yang dipilih JAUH SEBELUM bulan goal dibuat
      // Jika bulan yang dipilih lebih kecil dari bulan target, TAMPILKAN
      // Ini memastikan goal yang akan datang tetap terlihat
      // Jika goal dibuat di Nov 2025 (target_date), maka di Oct 2025 tetap tampil
      if (selectedMonthStart > targetMonthStart) {
        // HIDE jika bulan yang dipilih SUDAH melewati bulan target.
        return false;
      }
      
      // TAMPILKAN jika bulan yang dipilih adalah bulan yang sama atau bulan sebelumnya
      return true; 
    });

  }, [allSavingsGoals, selectedDate]);
  
  // ... (budgetPockets calculation remains unchanged)

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
    
    // 2. Tambahkan kategori yang punya pengeluaran tapi TIDAK di-budget (sebagai virtual pocket)
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

  const totalBudget = analytics?.budget?.total_amount || 0;
  const totalSpent = analytics?.summary?.total_expenses || 0;
  const totalRemaining = totalBudget - totalSpent; 
  const totalProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;


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
            <button onClick={handlePrevMonth}>&lt;</button>
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              dateFormat="MMMM yyyy"
              showMonthYearPicker
              showFullMonthYearPicker
              className="month-picker-input"
              popperPlacement="bottom"
            />
            <button onClick={handleNextMonth}>&gt;</button>
          </div>
          
          {error && <p className="error" style={{textAlign: 'center', padding: '1rem', backgroundColor: 'var(--color-bg-medium)', borderRadius: '12px'}}>{error}</p>}

          {/* [MODIFIKASI] Hanya tampilkan spinner untuk initial load */}
          {isLoading ? (
            <div >
               <div></div>
               <h2></h2>
            </div>
          ) : (
            analytics ? (
              // Konten ditampilkan meskipun isRefetching (silent update)
              // Menggunakan style inline untuk menghilangkan loading visual yang mengganggu.
              <div className="dashboard-grid" style={{ opacity: isRefetching ? 0.8 : 1, transition: 'opacity 0.3s' }}>
                
                <> 
                  <section className="card card-summary">
                    <h3>Ringkasan {formatMonthYear(selectedDate)}</h3>
                    <div className="summary-item">
                      <span>Total Pemasukan</span>
                      <span className="income">{formatCurrency(analytics.summary.total_income)}</span>
                    </div>
                    <div className="summary-item">
                      <span>Total Pengeluaran</span>
                      <span className="expense">{formatCurrency(analytics.summary.total_expenses)}</span>
                    </div>
                    
                    <div className="summary-item total-savings">
                      {/* [MODIFIKASI] Menggunakan totalSavingsCurrent yang sudah difilter */}
                      <span>Total Dana Tabungan</span>
                      <span className="income">{formatCurrency(totalSavingsCurrent)}</span>
                    </div>
                    
                    <hr />
                    <div className="summary-item total">
                      <span>Saldo</span>
                      <span>{formatCurrency(analytics.summary.balance)}</span>
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
                      onBudgetSet={handleDataUpdate}
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
                      onTransactionAdded={handleDataUpdate} 
                      onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
                      selectedDate={selectedDate}
                      isRefetching={isRefetching} 
                    />
                  </section>
                  
                  <SavingsGoals 
                    savingsGoals={filteredSavingsGoals} 
                    onDataUpdate={handleDataUpdate}
                    isRefetching={isRefetching}
                  />

                  <section className="card card-list full-height-card">
                    <h3>Transaksi {formatMonthYear(selectedDate)}</h3>
                    <ul>
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
                        {Object.keys(analytics.expenses_by_category).length > 0 ? (
                          Object.entries(analytics.expenses_by_category).map(([category, amount]) => (
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
          onSuccess={handleDataUpdate} 
        />
      )}
    </>
  );
};

export default Dashboard;