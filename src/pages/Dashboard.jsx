import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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

// [MODIFIKASI] Skeleton diganti spinner sederhana
const LoadingSpinner = () => (
  <div className="page-spinner-container" style={{ minHeight: '50vh' }}>
    <div className="page-spinner"></div>
    <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Memuat data...</p>
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
  const [isLoading, setIsLoading] = useState(true); 
  const [isRefetching, setIsRefetching] = useState(false); 
  const [error, setError] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState(null);
  
  const didMountRef = useRef(false); 

  // === [STATE BARU] ===
  // State untuk Tab
  const [activeTab, setActiveTab] = useState('summary'); // summary, forms, budget, savings
  // State untuk Menu Mobile
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  // === [AKHIR STATE BARU] ===

  // State untuk Animasi & Geser (Tetap ada)
  const [animationClass, setAnimationClass] = useState('');
  const [touchStart, setTouchStart] = useState(null);
  const minSwipeDistance = 75; 

  // --- (Semua fungsi data fetching (fetchMonthlyData, fetchStaticData) tidak berubah) ---
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

    try {
      if (accounts.length === 0 || categories.length === 0) {
        if (!isLoading) { 
           setAnalytics(null);
           setTransactions([]);
        }
        return; 
      }

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
  }, [selectedDate, accounts, categories, isLoading]); 

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
      
      return { 
        success: true, 
        hasAccounts: accountsRes.data.data.length > 0, 
        hasCategories: categoriesRes.data.data.length > 0 
      };
    } catch (err) {
      console.error("Failed to fetch static data:", err);
      setError(err.response?.data?.error || 'Gagal mengambil data statis');
      setIsLoading(false); 
      return { success: false, hasAccounts: false, hasCategories: false };
    }
  }, []); 

  // EFEK 1 (Tidak berubah)
  useEffect(() => {
    setIsLoading(true); 
    fetchStaticData().then((staticDataStatus) => {
      if (staticDataStatus.success && staticDataStatus.hasAccounts && staticDataStatus.hasCategories) {
        fetchMonthlyData(false); 
      } else {
        setIsLoading(false); 
        setAnalytics(null);
        setTransactions([]);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStaticData]);

  // EFEK 2 (Tidak berubah)
  useEffect(() => {
    if (didMountRef.current) {
      fetchMonthlyData(true); 
    } else {
      didMountRef.current = true;
    }
  }, [selectedDate, fetchMonthlyData]); 

  // --- (Semua fungsi refetch (refetchCategories, dll) tidak berubah) ---
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

  // FUNGSI UPDATE UTAMA (Tidak berubah)
  const handleDataUpdate = async (options = {}) => {
    if (accounts.length > 0 && categories.length > 0) {
      await fetchMonthlyData(true); // true = refetch
    }
    
    if (options.refetchCategories) await refetchCategories();
    if (options.refetchSavings) await refetchSavings();
    if (options.refetchAccounts) await refetchAccounts();
    
    triggerSuccessAnimation(); 
    setBudgetToEdit(null); 
  };

  // --- (Semua Memos (totalBalance, dll) tidak berubah) ---
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + parseFloat(acc.current_balance), 0);
  }, [accounts]);

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

  // --- (Variabel ringkasan (totalIncome, dll) tidak berubah) ---
  const totalIncome = analytics?.summary?.total_income || 0;
  const totalExpensesFiltered = analytics?.summary?.total_expenses || 0;
  const totalTransferredToSavings = analytics?.summary?.total_transferred_to_savings || 0;
  const totalBudget = analytics?.budget?.total_amount || 0;
  const totalSpent = totalExpensesFiltered;
  const totalRemaining = totalBudget - totalSpent; 
  const totalProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const currentBalance = totalIncome - totalSpent; 

  // --- (Semua Handler (handlePrevMonth, handleDelete, dll) tidak berubah) ---
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

  const handleDeleteBudget = async (e, budgetId) => {
    e.stopPropagation(); 
    if (!window.confirm('Yakin ingin menghapus budget pocket ini?')) return;
    setError('');
    setIsRefetching(true); 
    try {
      await axiosClient.delete(`/api/budgets/${budgetId}`);
      handleDataUpdate(); 
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menghapus budget');
      setIsRefetching(false);
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Yakin ingin menghapus transaksi ini?')) return;
    setError('');
    setIsRefetching(true); 
    try {
      await axiosClient.delete(`/api/transactions/${transactionId}`);
      handleDataUpdate({ refetchAccounts: true, refetchSavings: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menghapus transaksi');
      setIsRefetching(false);
    }
  };
  
  // === [FUNGSI BARU] ===
  // Handler untuk mengubah tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsFabMenuOpen(false); // Selalu tutup menu FAB setelah memilih
  };

  // Helper untuk menentukan class grid
  const getGridClass = (tab) => {
    if (tab === 'summary') return 'summary-layout';
    if (tab === 'forms') return 'forms-layout';
    if (tab === 'budget') return 'budget-layout';
    if (tab === 'savings') return 'savings-layout';
    return '';
  };
  // === [AKHIR FUNGSI BARU] ===


  const showSkeleton = isLoading || isRefetching; // Ganti nama variabel

  return (
    <>
      <div className="month-navigator">
        {/* ... (Isi MonthNavigator tidak berubah) ... */}
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
      
      {/* === [BARU] Desktop Tab Navbar === */}
      <nav className="dashboard-tabs">
        <button 
          className={activeTab === 'summary' ? 'active' : ''}
          onClick={() => handleTabChange('summary')}
          disabled={showSkeleton}
        >
          Ringkasan
        </button>
        <button 
          className={activeTab === 'forms' ? 'active' : ''}
          onClick={() => handleTabChange('forms')}
          disabled={showSkeleton}
        >
          Input Transaksi
        </button>
        <button 
          className={activeTab === 'budget' ? 'active' : ''}
          onClick={() => handleTabChange('budget')}
          disabled={showSkeleton}
        >
          Budget
        </button>
        <button 
          className={activeTab === 'savings' ? 'active' : ''}
          onClick={() => handleTabChange('savings')}
          disabled={showSkeleton}
        >
          Tabungan
        </button>
      </nav>

      {/* === [DIHAPUS] Mobile FAB Menu Dihapus === */}


      <div 
        className="dashboard-content-wrapper"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* === [MODIFIKASI] Logika Render Utama === */}

        {/* 1. Loading State */}
        {showSkeleton ? (
          <LoadingSpinner />
        ) : 
        
        /* 2. Error State */
        (error) ? (
          <div className="card" style={{textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem'}}>
            <p>Tidak dapat memuat data. Silakan coba lagi.</p>
            <p><i>{error}</i></p>
          </div>
        ) :

        /* 3. No Accounts State */
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
        
        /* 4. Data Tampil (Berbasis Tab) */
        (
          <div 
            className={`dashboard-grid ${getGridClass(activeTab)} ${animationClass}`}
            onAnimationEnd={() => setAnimationClass('')} 
          >
            
            {/* --- TAB 1: SUMMARY --- */}
            {activeTab === 'summary' && (
              <>
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
            )}

            {/* --- TAB 2: FORMS (INPUT) --- */}
            {activeTab === 'forms' && (
              <>
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
              </>
            )}
            
            {/* --- TAB 3: BUDGET --- */}
            {activeTab === 'budget' && (
              <>
                <section className="card card-budget-pocket">
                  <h3>Budget Pockets</h3>
                  {analytics ? (
                    <>
                      {/* === [INI PERBAIKANNYA] === */}
                      {/* Span persentase dihapus */}
                      <div className="budget-info total">
                        <span>Total Budget: {formatCurrency(totalBudget)}</span>
                        {/* <span>{totalProgress.toFixed(0)}%</span>  <-- DIHAPUS */}
                      </div>
                      {/* === [AKHIR PERBAIKAN] === */}

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
                    </>
                  ) : <p>Memuat info budget...</p>}
                  
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
              </>
            )}

            {/* --- TAB 4: SAVINGS --- */}
            {activeTab === 'savings' && (
              <>
                <SavingsGoals 
                  savingsGoals={filteredSavingsGoals} 
                  accounts={accounts} 
                  onDataUpdate={() => handleDataUpdate({ refetchSavings: true, refetchAccounts: true })} 
                  isRefetching={isRefetching}
                />
              </>
            )}

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