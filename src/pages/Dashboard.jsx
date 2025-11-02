import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
// [BARU] Impor Link
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatMonthYear } from '../utils/format';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import TransactionForm from '../components/TransactionForm';
import BudgetForm from '../components/BudgetForm';
import CategoryForm from '../components/CategoryForm';
import SavingsGoals from '../components/SavingsGoals'; 
import TransferForm from '../components/TransferForm'; 
import AccountSummary from '../components/AccountSummary'; 

// Komponen Skeleton untuk loading
const DashboardSkeleton = () => (
  // ... (Skeleton tidak berubah)
  <div className="skeleton-loader">
    {/* 1. Month Navigator Skeleton */}
    <div 
      className="month-navigator" 
      style={{ 
        backgroundColor: 'var(--color-bg-light)', 
        justifyContent: 'center',
        opacity: 0.7
      }}
    >
      <div className="skeleton-line h-1-5" style={{ width: '200px', backgroundColor: 'var(--color-border)', margin: 0 }}></div>
    </div>

    {/* 2. Grid Skeleton */}
    <div className="dashboard-grid">
      {/* Card 1: Summary */}
      <div className="skeleton-card">
        <div className="skeleton-line h-1-5 w-50" style={{ backgroundColor: 'var(--color-border)' }}></div>
        <div className="skeleton-line w-75"></div>
        <div className="skeleton-line w-75"></div>
        <div className="skeleton-line w-75"></div>
        <div className="skeleton-line h-1-5 w-75" style={{ marginTop: '1.5rem' }}></div>
      </div>

      {/* Card 2: Accounts */}
      <div className="skeleton-card">
        <div className="skeleton-line h-1-5 w-50" style={{ backgroundColor: 'var(--color-border)' }}></div>
        <div className="skeleton-line w-75"></div>
        <div className="skeleton-line w-75"></div>
        <div className="skeleton-line" style={{ height: '40px', marginTop: '1.5rem' }}></div>
      </div>

      {/* Card 3: Budget (Span 2) */}
      <div className="skeleton-card" style={{ gridColumn: 'span 1 / -1' }}>
        <div className="skeleton-line h-1-5 w-25" style={{ backgroundColor: 'var(--color-border)' }}></div>
        <div className="skeleton-line" style={{ height: '20px', margin: '1rem 0' }}></div>
        <div className="skeleton-line" style={{ height: '80px', marginTop: '1.5rem' }}></div>
      </div>

      {/* Card 4: Transaction Form */}
      <div className="skeleton-card">
        <div className="skeleton-line h-1-5 w-50" style={{ backgroundColor: 'var(--color-border)' }}></div>
        <div className="skeleton-line" style={{ height: '40px', marginTop: '1rem' }}></div>
        <div className="skeleton-line" style={{ height: '40px', marginTop: '1rem' }}></div>
        <div className="skeleton-line" style={{ height: '40px', marginTop: '1rem' }}></div>
        <div className="skeleton-line" style={{ height: '40px', marginTop: '1rem' }}></div>
      </div>

      {/* Card 7: Transaction List (Span 2 Row) */}
      <div className="skeleton-card" style={{ gridRow: 'span 2' }}>
        <div className="skeleton-line h-1-5 w-50" style={{ backgroundColor: 'var(--color-border)' }}></div>
        <div className="skeleton-line" style={{ height: '3rem', marginTop: '1rem' }}></div>
        <div className="skeleton-line" style={{ height: '3rem', marginTop: '1rem' }}></div>
        <div className="skeleton-line" style={{ height: '3rem', marginTop: '1rem' }}></div>
        <div className="skeleton-line" style={{ height: '3rem', marginTop: '1rem' }}></div>
        <div className="skeleton-line" style={{ height: '3rem', marginTop: '1rem' }}></div>
      </div>

      {/* Card 5: Transfer Form */}
      <div className="skeleton-card">
          <div className="skeleton-line h-1-5 w-50" style={{ backgroundColor: 'var(--color-border)' }}></div>
        <div className="skeleton-line" style={{ height: '40px', marginTop: '1rem' }}></div>
        <div className="skeleton-line" style={{ height: '40px', marginTop: '1rem' }}></div>
        <div className="skeleton-line" style={{ height: '40px', marginTop: '1rem' }}></div>
      </div>
    </div>
  </div>
);


const Dashboard = () => {
  const { triggerSuccessAnimation } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // State Data Utama
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [allSavingsGoals, setAllSavingsGoals] = useState([]); 
  
  // State UI
  const [isLoading, setIsLoading] = useState(true); // Ganti nama dari 'isLoading' ke 'isLoading'
  const [isRefetching, setIsRefetching] = useState(false); 
  const [error, setError] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState(null);
  
  // === [PERBAIKAN 1] ===
  // Ganti `isInitialMount` dengan `didMountRef` untuk skip Efek ganti tanggal
  const didMountRef = useRef(false); 

  // State untuk Animasi & Geser
  const [animationClass, setAnimationClass] = useState('');
  const [touchStart, setTouchStart] = useState(null);
  const minSwipeDistance = 75; 

  // === [PERBAIKAN 2] ===
  // Fungsi untuk mengambil data bulanan (Analytics + Transaksi)
  // Sekarang menerima flag `isRefetch` dan HANYA mengatur state loading.
  const fetchMonthlyData = useCallback(async (isRefetch = false) => {
    if (isRefetch) {
      setIsRefetching(true);
    } else {
      // Jika bukan refetch, berarti ini adalah bagian dari load awal
      setIsLoading(true);
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
      setError(err.response?.data?.error || 'Gagal mengambil data bulanan');
    } finally {
      // Selalu matikan SEMUA state loading
      setIsLoading(false); 
      setIsRefetching(false);
    }
  }, [selectedDate]); // Dependency HANYA selectedDate

  // === [PERBAIKAN 3] ===
  // Fungsi untuk mengambil data statis (Kategori + Tabungan + Akun)
  // Sekarang me-return status untuk chain di useEffect
  const fetchStaticData = useCallback(async () => {
    try {
      const [categoriesRes, savingsRes, accountsRes] = await Promise.all([
        axiosClient.get('/api/categories'),
        axiosClient.get('/api/savings'),
        axiosClient.get('/api/accounts'),
      ]);
      setCategories(categoriesRes.data.data);
      setAllSavingsGoals(savingsRes.data.data);
      setAccounts(accountsRes.data.data);
      
      // Kembalikan status
      return { 
        success: true, 
        hasAccounts: accountsRes.data.data.length > 0, 
        hasCategories: categoriesRes.data.data.length > 0 
      };
    } catch (err) {
      console.error("Failed to fetch static data:", err);
      setError(err.response?.data?.error || 'Gagal mengambil data statis');
      setIsLoading(false); // Matikan loading jika data statis gagal
      return { success: false, hasAccounts: false, hasCategories: false };
    }
  }, []); // Dependency kosong, hanya jalan sekali

  // === [PERBAIKAN 4] ===
  // Hapus dua useEffect lama dan ganti dengan ini:

  // EFEK 1: Load Awal (Hanya berjalan sekali saat mount)
  useEffect(() => {
    setIsLoading(true); // 1. Set loading global
    
    fetchStaticData().then((staticDataStatus) => {
      // 2. Ambil data statis
      
      // 3. Cek hasil data statis
      if (staticDataStatus.success && staticDataStatus.hasAccounts && staticDataStatus.hasCategories) {
        // 4. Jika sukses & ada data, ambil data bulanan
        // `fetchMonthlyData` akan otomatis mematikan `isLoading` saat selesai
        fetchMonthlyData(false); // false = bukan refetch
      } else {
        // 5. Jika gagal ATAU tidak ada akun/kategori, matikan loading manual
        setIsLoading(false); 
        setAnalytics(null);
        setTransactions([]);
      }
    });
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStaticData]); // fetchMonthlyData dihapus dari sini agar tidak re-trigger


  // EFEK 2: Handle Ganti Tanggal (Hanya berjalan saat selectedDate berubah)
  useEffect(() => {
    // Cek `didMountRef` untuk MELEWATKAN panggilan pertama (karena EFEK 1 sudah handle)
    if (didMountRef.current) {
      
      // Cek apakah kita punya akun/kategori sebelum fetch
      if (accounts.length > 0 && categories.length > 0) {
        fetchMonthlyData(true); // true = ini adalah refetch
      }
      
    } else {
      // Ini adalah panggilan saat mount, tandai saja sudah mount
      didMountRef.current = true;
    }
  }, [selectedDate, fetchMonthlyData, accounts, categories]); // Bergantung pada tanggal & data statis

  // === [AKHIR PERBAIKAN LOGIKA] ===


  // Fungsi untuk mengambil ulang data individual
  const refetchCategories = useCallback(async () => {
    try {
      const res = await axiosClient.get('/api/categories');
      setCategories(res.data.data);
    } catch (err) { console.error("Failed to re-fetch categories:", err); }
  }, []);

  const refetchSavings = useCallback(async () => {
    try {
      const res = await axiosClient.get('/api/savings');
      setAllSavingsGoals(res.data.data); 
    } catch (err) { console.error("Failed to re-fetch savings:", err); }
  }, []);

  const refetchAccounts = useCallback(async () => {
    try {
      const res = await axiosClient.get('/api/accounts');
      setAccounts(res.data.data); 
    } catch (err) { console.error("Failed to re-fetch accounts:", err); }
  }, []);

  // FUNGSI UPDATE UTAMA
  const handleDataUpdate = async (options = {}) => {
    // Panggil fetchMonthlyData (karena ini akan handle state loading/refetching)
    if (accounts.length > 0 && categories.length > 0) {
      await fetchMonthlyData(true); // true = refetch
    }
    
    if (options.refetchCategories) await refetchCategories();
    if (options.refetchSavings) await refetchSavings();
    if (options.refetchAccounts) await refetchAccounts();
    
    triggerSuccessAnimation(); 
    setBudgetToEdit(null); 
  };

  // Memo untuk total saldo
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + parseFloat(acc.current_balance), 0);
  }, [accounts]);

  // Memo untuk filter tabungan
  const filteredSavingsGoals = useMemo(() => {
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

  // Memo untuk budget pockets
  const budgetPockets = useMemo(() => {
    if (!analytics) return [];
    const budgetDetails = analytics.budget?.details || [];
    const expenses = analytics.expenses_by_category || {};
    const pockets = budgetDetails.map(budget => {
      const spent = expenses[budget.category_name] || 0;
      return { ...budget, spent, remaining: budget.amount - spent, progress: budget.amount > 0 ? (spent / budget.amount) * 100 : 0 };
    });
    const existingBudgetNames = new Set(pockets.map(p => p.category_name));
    Object.keys(expenses).forEach(categoryName => {
      if (!existingBudgetNames.has(categoryName)) { 
        pockets.push({ id: `virtual-${categoryName}`, category_name: categoryName, amount: 0, spent: expenses[categoryName], remaining: -expenses[categoryName], progress: 100 });
      }
    });
    return pockets;
  }, [analytics]);

  // Variabel ringkasan
  const totalIncome = analytics?.summary?.total_income || 0;
  const totalExpensesFiltered = analytics?.summary?.total_expenses || 0;
  const totalTransferredToSavings = analytics?.summary?.total_transferred_to_savings || 0;
  const totalBudget = analytics?.budget?.total_amount || 0;
  const totalSpent = totalExpensesFiltered;
  const totalRemaining = totalBudget - totalSpent; 
  const totalProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const currentBalance = totalIncome - totalSpent; 

  // Handler Navigasi & Geser
  const handlePrevMonth = () => {
    if (isRefetching || animationClass || isLoading) return; // Tambah cek isLoading
    setAnimationClass('slide-in-right');
    setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    if (isRefetching || animationClass || isLoading) return; // Tambah cek isLoading
    setAnimationClass('slide-in-left');
    setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
  };

  const handleTouchStart = (e) => {
    if (isRefetching || animationClass || isLoading) return;
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStart === null || isRefetching || animationClass || isLoading) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const deltaX = touchEnd - touchStart;
    
    if (deltaX > minSwipeDistance) {
      handlePrevMonth();
    } else if (deltaX < -minSwipeDistance) {
      handleNextMonth();
    }
    
    setTouchStart(null);
  };

  // Handler Delete
  const handleDeleteBudget = async (e, budgetId) => {
    e.stopPropagation(); 
    if (!window.confirm('Yakin ingin menghapus budget pocket ini?')) return;
    setError('');
    setIsRefetching(true); // Set refetching manual
    try {
      await axiosClient.delete(`/api/budgets/${budgetId}`);
      handleDataUpdate(); // handleDataUpdate akan memanggil fetchMonthlyData
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menghapus budget');
      setIsRefetching(false);
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Yakin ingin menghapus transaksi ini?')) return;
    setError('');
    setIsRefetching(true); // Set refetching manual
    try {
      await axiosClient.delete(`/api/transactions/${transactionId}`);
      handleDataUpdate({ refetchAccounts: true, refetchSavings: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menghapus transaksi');
      setIsRefetching(false);
    }
  };
  
  // Gabungkan isLoading dan isRefetching untuk Skeleton
  const showSkeleton = isLoading || isRefetching;

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
      
      <div 
        className="dashboard-content-wrapper"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* === [MODIFIKASI LOGIKA RENDER] === */}

        {/* 1. Loading State (termasuk refetching) */}
        {showSkeleton ? (
          <DashboardSkeleton />
        ) : 
        
        /* 2. Error State (Prioritas di atas) */
        (error) ? (
          <div style={{textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem'}}>
            <p>Tidak dapat memuat data. Silakan coba lagi.</p>
            <p><i>{error}</i></p>
          </div>
        ) :

        /* 3. No Accounts State (NEW) */
        (accounts.length === 0) ? (
          <div className="card" style={{ textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
            <h2>Selamat Datang! 🎉</h2>
            <p>Anda belum memiliki akun. Akun adalah tempat Anda menyimpan uang (misal: Bank, E-Wallet, atau Tunai).</p>
            <p style={{ marginBottom: '1.5rem' }}>Silakan buat akun pertama Anda untuk memulai.</p>
            <Link to="/accounts" className="btn-link-full" style={{ marginTop: 0, backgroundColor: 'var(--color-primary)', color: 'var(--color-button-text)' }}>
              Buat Akun Pertama
            </Link>
          </div>
        ) :
        
        /* 4. Analytics Data State (Existing) */
        (analytics) ? (
          <div 
            className={`dashboard-grid ${animationClass}`}
            onAnimationEnd={() => setAnimationClass('')} 
          >
            
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

              <AccountSummary accounts={accounts} />

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
                  {budgetPockets.map(pocket => (
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
                  ))}
                </div>
              </section>

              <section className="card card-form">
                <h3>Tambah Transaksi Baru</h3>
                <TransactionForm 
                  categories={categories} 
                  accounts={accounts} 
                  onTransactionAdded={() => handleDataUpdate({ refetchAccounts: true })} 
                  onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
                  selectedDate={selectedDate}
                  isRefetching={isRefetching} 
                />
              </section>

              <section className="card card-form">
                <h3>Transfer Antar Akun</h3>
                <TransferForm
                  accounts={accounts}
                  onTransferAdded={() => handleDataUpdate({ refetchAccounts: true })}
                  isRefetching={isRefetching}
                  selectedDate={selectedDate}
                />
              </section>
              
              <SavingsGoals 
                savingsGoals={filteredSavingsGoals} 
                accounts={accounts} 
                onDataUpdate={() => handleDataUpdate({ refetchSavings: true, refetchAccounts: true })} 
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
                          <span>
                            {new Date(t.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'})}
                            {/* [PERBAIKAN] Tampilkan nama akun asal (bukan join 'accounts') */}
                            {t.accounts ? ` • ${t.accounts.name}` : ''}
                          </span>
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

            </>
          </div>
        ) : 
        
        /* 5. Fallback (Jika analytics null tapi accounts ada) */
        (
          <div style={{textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem'}}>
            <p>Belum ada data untuk bulan ini.</p>
          </div>
        )
        
        }
      </div> 

      {isCategoryModalOpen && (
        <CategoryForm 
          existingCategories={categories}
          onClose={() => setIsCategoryModalOpen(false)}
          onSuccess={() => handleDataUpdate({ refetchCategories: true })} 
        />
      )}
    </>
  );
};

export default Dashboard;