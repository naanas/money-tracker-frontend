// naanas/money-tracker-frontend/src/pages/Dashboard.jsx
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
import TransactionDetailModal from '../components/TransactionDetailModal';

// Komponen Loading Kecil
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
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const didMountRef = useRef(false); 

  // State Tab & Animasi
  const [activeTab, setActiveTab] = useState('summary');
  const [animationClass, setAnimationClass] = useState('');
  const [touchStart, setTouchStart] = useState(null);
  const minSwipeDistance = 75; 

  // --- FETCH DATA BULANAN ---
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
      // Jangan fetch jika belum punya akun/kategori dasar (untuk pengguna baru)
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
  }, [selectedDate, accounts.length, categories.length]); // Hapus isLoading dari dependency biar gak loop

  // --- FETCH DATA STATIS (Awal Load) ---
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
      setError('Gagal memuat data awal. Periksa koneksi internet Anda.');
      setIsLoading(false); 
      return { success: false, hasAccounts: false, hasCategories: false };
    }
  }, []); 

  // EFEK 1: Initial Load
  useEffect(() => {
    fetchStaticData().then((status) => {
      if (status.success && status.hasAccounts && status.hasCategories) {
        fetchMonthlyData(false); 
      } else {
        setIsLoading(false); 
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // EFEK 2: Saat Ganti Bulan
  useEffect(() => {
    if (didMountRef.current) {
      fetchMonthlyData(true); 
    } else {
      didMountRef.current = true;
    }
  }, [selectedDate, fetchMonthlyData]); 

  // --- FUNGSI REFETCH PARTIAL ---
  const refetchCategories = async () => {
    const res = await axiosClient.get('/api/categories');
    setCategories(res.data.data);
  };
  const refetchSavings = async () => {
     const res = await axiosClient.get('/api/savings');
     setAllSavingsGoals(res.data.data);
  };
  const refetchAccounts = async () => {
      const res = await axiosClient.get('/api/accounts');
      setAccounts(res.data.data);
  };

  // --- HANDLE DATA UPDATE UTAMA ---
  const handleDataUpdate = async (options = {}) => {
    // Trigger animasi sukses dulu biar kerasa responsif
    triggerSuccessAnimation();
    setBudgetToEdit(null);

    // Lakukan refetch di background
    const promises = [];
    if (accounts.length > 0 && categories.length > 0) {
        promises.push(fetchMonthlyData(true));
    }
    if (options.refetchCategories) promises.push(refetchCategories());
    if (options.refetchSavings) promises.push(refetchSavings());
    if (options.refetchAccounts) promises.push(refetchAccounts());
    
    await Promise.all(promises);
  };

  // --- MEMOS ---
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + parseFloat(acc.current_balance), 0);
  }, [accounts]);

  const filteredSavingsGoals = useMemo(() => {
    const goals = allSavingsGoals;
    const selectedMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    return goals.filter(goal => {
      if (!goal.target_date) return true;
      const targetDate = new Date(goal.target_date);
      // Tampilkan jika target date masih di masa depan atau di bulan ini
      return targetDate >= selectedMonthStart;
    });
  }, [allSavingsGoals, selectedDate]);

  const budgetPockets = useMemo(() => {
    if (!analytics) return [];
    const budgetDetails = analytics.budget?.details || [];
    const expenses = analytics.expenses_by_category || {};
    
    // 1. Masukkan budget yang beneran ada
    const pockets = budgetDetails.map(budget => {
      const spent = expenses[budget.category_name] || 0;
      return { 
          ...budget, 
          spent, 
          remaining: budget.amount - spent, 
          progress: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
          isVirtual: false
      };
    });

    // 2. Masukkan "Virtual Pockets" (kategori yg ada pengeluaran tapi gak ada budget)
    const existingBudgetNames = new Set(pockets.map(p => p.category_name));
    Object.keys(expenses).forEach(categoryName => {
      if (!existingBudgetNames.has(categoryName)) { 
        pockets.push({ 
            id: `virtual-${categoryName}`, 
            category_name: categoryName, 
            amount: 0, 
            spent: expenses[categoryName], 
            remaining: -expenses[categoryName], 
            progress: 100,
            isVirtual: true 
        });
      }
    });

    // Sort biar yang Real ada di atas, Virtual di bawah
    return pockets.sort((a, b) => (a.isVirtual === b.isVirtual) ? 0 : a.isVirtual ? 1 : -1);
  }, [analytics]);

  // --- VARIABLES ---
  const totalIncome = analytics?.summary?.total_income || 0;
  const totalExpensesFiltered = analytics?.summary?.total_expenses || 0;
  const totalTransferredToSavings = analytics?.summary?.total_transferred_to_savings || 0;
  const totalBudget = analytics?.budget?.total_amount || 0;
  const totalSpent = totalExpensesFiltered;
  const totalRemaining = totalBudget - totalSpent; 
  const totalProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const currentBalance = totalIncome - totalSpent; 

  // --- HANDLERS ---
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

  const handleTouchStart = (e) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStart;
    if (deltaX > minSwipeDistance) handlePrevMonth();
    else if (deltaX < -minSwipeDistance) handleNextMonth();
    setTouchStart(null);
  };

  // === [PERBAIKAN UTAMA: OPTIMISTIC DELETE] ===
  const handleDeleteBudget = async (e, budgetId) => {
    e.stopPropagation(); 
    if (!window.confirm('Yakin ingin menghapus budget pocket ini?')) return;
    
    // 1. Optimistic Update: Langsung hapus dari state lokal agar UI responsif
    setAnalytics(prev => {
        if(!prev) return prev;
        return {
            ...prev,
            budget: {
                ...prev.budget,
                details: prev.budget.details.filter(b => b.id !== budgetId)
            }
        }
    });

    try {
      // 2. Request hapus ke server di background
      await axiosClient.delete(`/api/budgets/${budgetId}`);
      // 3. Refetch diam-diam untuk memastikan data sinkron
      fetchMonthlyData(true);
    } catch (err) {
      console.error("Gagal hapus budget:", err);
      alert("Gagal menghapus budget dari server. Data akan dimuat ulang.");
      fetchMonthlyData(true); // Revert jika gagal
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Yakin ingin menghapus transaksi ini?')) return;
    
    // Optimistic remove transaction from list
    setTransactions(prev => prev.filter(t => t.id !== transactionId));

    try {
      await axiosClient.delete(`/api/transactions/${transactionId}`);
      handleDataUpdate({ refetchAccounts: true, refetchSavings: true });
    } catch (err) {
        alert('Gagal menghapus transaksi.');
        fetchMonthlyData(true); // Revert
    }
  };
  
  const handleTabChange = (tab) => setActiveTab(tab);
  const getGridClass = (tab) => {
    switch(tab) {
        case 'summary': return 'summary-layout';
        case 'forms': return 'forms-layout';
        case 'budget': return 'budget-layout';
        case 'savings': return 'savings-layout';
        default: return '';
    }
  };

  const showSkeleton = isLoading; // Hanya tampilkan skeleton saat initial load penuh

  return (
    <>
      {/* NAVIGASI BULAN */}
      <div className="month-navigator">
        <button onClick={handlePrevMonth} disabled={!!animationClass || isLoading}>&lt;</button>
        <DatePicker
          selected={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          dateFormat="MMMM yyyy"
          showMonthYearPicker
          showFullMonthYearPicker
          className="month-picker-input"
          popperPlacement="bottom"
          disabled={!!animationClass || isLoading}
        />
        <button onClick={handleNextMonth} disabled={!!animationClass || isLoading}>&gt;</button>
      </div>
      
      {/* TAB NAVIGASI (Desktop/Mobile) */}
      <nav className="dashboard-tabs">
        {['summary', 'forms', 'budget', 'savings'].map(tab => (
             <button 
                key={tab}
                className={activeTab === tab ? 'active' : ''}
                onClick={() => handleTabChange(tab)}
                disabled={showSkeleton}
             >
               {tab === 'summary' ? 'Ringkasan' : 
                tab === 'forms' ? 'Input Transaksi' : 
                tab.charAt(0).toUpperCase() + tab.slice(1)}
             </button>
        ))}
      </nav>

      {/* KONTEN DASHBOARD */}
      <div 
        className={`dashboard-content-wrapper ${isRefetching ? 'is-refreshing' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {showSkeleton ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="card" style={{textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem'}}>
            <p>Gagal memuat data.</p>
            <button onClick={() => window.location.reload()} className="btn-secondary" style={{marginTop: '1rem', width: 'auto'}}>Coba Lagi</button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
            <h2>Selamat Datang! 🎉</h2>
            <p>Anda belum memiliki akun (sumber dana).</p>
            <Link to="/accounts" className="btn-link-full" style={{backgroundColor: 'var(--color-primary)', color: 'var(--color-button-text)'}}>
              Buat Akun Pertama
            </Link>
          </div>
        ) : (
          <div 
            className={`dashboard-grid ${getGridClass(activeTab)} ${animationClass}`}
            onAnimationEnd={() => setAnimationClass('')} 
          >
            
            {/* === TAB 1: SUMMARY === */}
            {activeTab === 'summary' && analytics && (
              <>
                <section className="card card-summary">
                  <h3>Ringkasan {formatMonthYear(selectedDate)}</h3>
                  <div className="summary-item"><span>Pemasukan</span><span className="income">{formatCurrency(totalIncome)}</span></div>
                  <div className="summary-item"><span>Pengeluaran</span><span className="expense">{formatCurrency(totalExpensesFiltered)}</span></div>
                  <div className="summary-item"><span>Ditabung</span><span className="income">{formatCurrency(totalTransferredToSavings)}</span></div>
                  <hr />
                  <div className="summary-item total"><span>Sisa (Bulan Ini)</span><span>{formatCurrency(currentBalance)}</span></div>
                  <div className="summary-item total" style={{fontSize: "1.1em", marginTop: "0.5rem", opacity: 0.8}}>
                      <span>Total Saldo Aset</span><span>{formatCurrency(totalBalance)}</span>
                  </div>
                </section>

                <AccountSummary accounts={accounts} />

                <section className="card card-list full-height-card">
                  <h3>Riwayat Transaksi</h3>
                  {transactions.length > 0 ? (
                    <ul>
                      {transactions.map((t) => (
                        <li key={t.id} className="list-item">
                          <button className="btn-delete-item" onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(t.id); }}>✕</button>
                          <div className="list-item-clickable-area" onClick={() => setSelectedTransaction(t)}>
                            <div className="list-item-details">
                              <strong>{t.description || t.category}</strong>
                              <span>{new Date(t.date).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})} • {t.accounts?.name}</span>
                            </div>
                            <span className={t.type}>{t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : <p style={{textAlign: 'center', color: 'var(--color-text-muted)', padding: '1rem'}}>Belum ada transaksi bulan ini.</p>}
                </section>
              </>
            )}

            {/* === TAB 2: FORMS === */}
            {activeTab === 'forms' && (
              <>
                <section className="card card-form">
                  <h3>Catat Transaksi</h3>
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
                  <h3>Pindah Dana (Transfer)</h3>
                  <TransferForm accounts={accounts} onTransferAdded={() => handleDataUpdate({ refetchAccounts: true })} isRefetching={isRefetching} selectedDate={selectedDate} />
                </section>
              </>
            )}
            
            {/* === TAB 3: BUDGET === */}
            {activeTab === 'budget' && analytics && (
              <section className="card card-budget-pocket">
                <h3>Budget Pockets</h3>
                <div className="budget-info total">
                   <span>Total Budget: {formatCurrency(totalBudget)}</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{width: `${Math.min(totalProgress, 100)}%`, backgroundColor: totalRemaining < 0 ? 'var(--color-accent-expense)' : 'var(--color-primary)'}}></div>
                </div>
                <div className="pocket-footer" style={{marginTop: '0.25rem'}}>
                    <span className="expense">{formatCurrency(totalSpent)} Terpakai</span>
                    <span className={`total ${totalRemaining < 0 ? 'expense' : ''}`}>
                        {totalRemaining < 0 ? `Over ${formatCurrency(Math.abs(totalRemaining))}` : `Sisa ${formatCurrency(totalRemaining)}`}
                    </span>
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
                      onClick={() => !pocket.isVirtual && setBudgetToEdit(pocket)}
                      style={pocket.isVirtual ? { opacity: 0.7, borderStyle: 'dashed' } : {}}
                      title={pocket.isVirtual ? "Ini adalah 'Virtual Pocket' karena ada pengeluaran tanpa budget." : "Klik untuk edit budget ini"}
                    >
                        {!pocket.isVirtual && (
                          <button className="pocket-delete-btn" onClick={(e) => handleDeleteBudget(e, pocket.id)}>✕</button>
                        )}
                        <div className="pocket-header">
                          <span className="pocket-title">{pocket.category_name} {pocket.isVirtual && '*'}</span>
                          <span className={`pocket-remaining ${pocket.remaining < 0 ? 'expense' : ''}`}>
                            {pocket.remaining < 0 ? 'Over!' : `${formatCurrency(pocket.remaining)}`}
                          </span>
                        </div>
                        <div className="progress-bar-container small">
                          <div className={`progress-bar-fill ${pocket.progress > 100 ? 'expense' : ''}`} style={{ width: `${Math.min(pocket.progress, 100)}%` }}></div>
                        </div>
                        <div className="pocket-footer">
                          <span className="expense">{formatCurrency(pocket.spent)}</span>
                          <span className="total"> / {formatCurrency(pocket.amount)}</span>
                        </div>
                    </div>
                  ))}
                </div>
                {budgetPockets.some(p => p.isVirtual) && (
                    <p style={{fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '1rem'}}>
                        * Kategori dengan tanda bintang adalah Virtual Pocket (ada pengeluaran tapi belum ada budget).
                    </p>
                )}
              </section>
            )}

            {/* === TAB 4: SAVINGS === */}
            {activeTab === 'savings' && (
                <SavingsGoals 
                  savingsGoals={filteredSavingsGoals} 
                  accounts={accounts} 
                  onDataUpdate={() => handleDataUpdate({ refetchSavings: true, refetchAccounts: true })} 
                  isRefetching={isRefetching}
                />
            )}

          </div>
        )}
      </div> 

      {/* MODALS */}
      {isCategoryModalOpen && (
        <CategoryForm 
          existingCategories={categories}
          onClose={() => setIsCategoryModalOpen(false)}
          onSuccess={() => handleDataUpdate({ refetchCategories: true })} 
        />
      )}
      {selectedTransaction && (
        <TransactionDetailModal 
          transaction={selectedTransaction} 
          onClose={() => setSelectedTransaction(null)} 
        />
      )}
    </>
  );
};

export default Dashboard;