import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom'; 
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatMonthYear } from '../utils/format';
import { useData } from '../contexts/DataContext'; 

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import TransactionForm from '../components/TransactionForm';
import BudgetForm from '../components/BudgetForm';
import CategoryForm from '../components/CategoryForm';
import SavingsGoals from '../components/SavingsGoals'; 
import TransferForm from '../components/TransferForm'; 
import AccountSummary from '../components/AccountSummary'; 

// Komponen Notifikasi Selamat Datang (Tidak berubah)
const WelcomeNotification = () => (
  <div className="card welcome-notification-card">
    <h2>Selamat Datang di Money Tracker! 👋</h2>
    <p>
      Langkah pertama untuk memulai adalah membuat akun (rekening bank, dompet digital, atau tunai) untuk melacak transaksi Anda.
    </p>
    <p>
      Setelah Anda membuat akun, dashboard lengkap Anda akan muncul di sini.
    </p>
    <Link to="/accounts" className="btn-go-to-accounts">
      Buat Akun Sekarang
    </Link>
  </div>
);

// Komponen Skeleton (Tidak berubah)
const DashboardSkeleton = () => (
  <div className="skeleton-loader">
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
    <div className="dashboard-grid">
      <div className="skeleton-card">
        <div className="skeleton-line h-1-5 w-50" style={{ backgroundColor: 'var(--color-border)' }}></div>
        <div className="skeleton-line w-75"></div>
        <div className="skeleton-line w-75"></div>
        <div className="skeleton-line w-75"></div>
        <div className="skeleton-line h-1-5 w-75" style={{ marginTop: '1.5rem' }}></div>
      </div>
      <div className="skeleton-card">
        <div className="skeleton-line h-1-5 w-50" style={{ backgroundColor: 'var(--color-border)' }}></div>
        <div className="skeleton-line w-75"></div>
        <div className="skeleton-line w-75"></div>
        <div className="skeleton-line" style={{ height: '40px', marginTop: '1.5rem' }}></div>
      </div>
      <div className="skeleton-card" style={{ gridColumn: 'span 1 / -1' }}>
        <div className="skeleton-line h-1-5 w-25" style={{ backgroundColor: 'var(--color-border)' }}></div>
        <div className="skeleton-line" style={{ height: '20px', margin: '1rem 0' }}></div>
        <div className="skeleton-line" style={{ height: '80px', marginTop: '1.5rem' }}></div>
      </div>
      <div className="skeleton-card">
        <div className="skeleton-line h-1-5 w-50" style={{ backgroundColor: 'var(--color-border)' }}></div>
        <div className="skeleton-line" style={{ height: '40px', marginTop: '1rem' }}></div>
        <div className="skeleton-line" style={{ height: '40px', marginTop: '1rem' }}></div>
        <div className="skeleton-line" style={{ height: '40px', marginTop: '1rem' }}></div>
        <div className="skeleton-line" style={{ height: '40px', marginTop: '1rem' }}></div>
      </div>
      <div className="skeleton-card" style={{ gridRow: 'span 2' }}>
        <div className="skeleton-line h-1-5 w-50" style={{ backgroundColor: 'var(--color-border)' }}></div>
        <div className="skeleton-line" style={{ height: '3rem', marginTop: '1rem' }}></div>
        <div className="skeleton-line" style={{ height: '3rem', marginTop: '1rem' }}></div>
        <div className="skeleton-line" style={{ height: '3rem', marginTop: '1rem' }}></div>
        <div className="skeleton-line" style={{ height: '3rem', marginTop: '1rem' }}></div>
        <div className="skeleton-line" style={{ height: '3rem', marginTop: '1rem' }}></div>
      </div>
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
  
  const { accounts, categories, staticLoading, refetchAccounts, refetchCategories } = useData();
  
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [allSavingsGoals, setAllSavingsGoals] = useState([]); 
  
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false); 
  const [error, setError] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState(null);
  const isInitialMount = useRef(true); 

  const [animationClass, setAnimationClass] = useState('');
  const [touchStart, setTouchStart] = useState(null);
  const minSwipeDistance = 75; 
  
  // === [STATE BARU UNTUK FILTER] ===
  const [filterType, setFilterType] = useState(''); // 'income', 'expense', or ''
  const [filterAccountId, setFilterAccountId] = useState(''); // account_id or ''
  
  // === [MODIFIKASI] fetchMonthlyData ===
  const fetchMonthlyData = useCallback(async () => {
    if (isInitialMount.current) {
      setIsMonthlyLoading(true);
      isInitialMount.current = false;
    } else {
      setIsRefetching(true);
    }
    setError('');
    
    const month = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();
    
    // [BARU] Tambahkan filter ke params
    const params = { month, year };
    if (filterType) params.type = filterType;
    if (filterAccountId) params.account_id = filterAccountId;
    
    try {
      const [analyticsRes, transactionsRes, savingsRes] = await Promise.all([
        axiosClient.get('/api/analytics/summary', { params: { month, year } }), // Analytics JANGAN difilter
        axiosClient.get('/api/transactions', { params }), // Transaksi DI-FILTER
        axiosClient.get('/api/savings'),
      ]);
      setAnalytics(analyticsRes.data.data);
      setTransactions(transactionsRes.data.data.transactions);
      setAllSavingsGoals(savingsRes.data.data);
    } catch (err) {
      console.error("Failed to fetch monthly data:", err);
      setError(err.response?.data?.error || 'Gagal mengambil data bulanan');
    } finally {
      setIsMonthlyLoading(false);
      setIsRefetching(false);
    }
  // [BARU] Tambahkan filter ke dependency array
  }, [selectedDate, filterType, filterAccountId]); 

  // === [MODIFIKASI] EFEK 2 ===
  useEffect(() => {
    if (staticLoading || accounts.length === 0) return;
    
    fetchMonthlyData();
  // [BARU] Tambahkan filter ke dependency array
  }, [selectedDate, accounts, categories, staticLoading, fetchMonthlyData, filterType, filterAccountId]); 

  const refetchSavings = useCallback(async () => {
    try {
      const res = await axiosClient.get('/api/savings');
      setAllSavingsGoals(res.data.data); 
    } catch (err) { console.error("Failed to re-fetch savings:", err); }
  }, []);

  // FUNGSI UPDATE UTAMA
  const handleDataUpdate = async (options = {}) => {
    setIsRefetching(true); 

    await fetchMonthlyData(); 
    
    if (options.refetchCategories) await refetchCategories();
    if (options.refetchSavings) await refetchSavings();
    if (options.refetchAccounts) await refetchAccounts();
    
    triggerSuccessAnimation(); 
    setBudgetToEdit(null); 
    setIsRefetching(false); 
  };
  
  // ... (SEMUA FUNGSI MEMO & HANDLER LAINNYA TIDAK BERUBAH) ...
  const totalBalance = useMemo(() => accounts.reduce((sum, acc) => sum + parseFloat(acc.current_balance), 0), [accounts]);
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
  const totalIncome = analytics?.summary?.total_income || 0;
  const totalExpensesFiltered = analytics?.summary?.total_expenses || 0;
  const totalTransferredToSavings = analytics?.summary?.total_transferred_to_savings || 0;
  const totalBudget = analytics?.budget?.total_amount || 0;
  const totalSpent = totalExpensesFiltered;
  const totalRemaining = totalBudget - totalSpent; 
  const totalProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const currentBalance = totalIncome - totalSpent; 
  const handlePrevMonth = () => {
    if (isRefetching || animationClass) return;
    setAnimationClass('slide-in-right');
    setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    if (isRefetching || animationClass) return;
    setAnimationClass('slide-in-left');
    setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
  };
  const handleTouchStart = (e) => {
    if (isRefetching || animationClass) return;
    setTouchStart(e.targetTouches[0].clientX);
  };
  const handleTouchEnd = (e) => {
    if (touchStart === null || isRefetching || animationClass) return;
    const touchEnd = e.changedTouches[0].clientX;
    const deltaX = touchEnd - touchStart;
    if (deltaX > minSwipeDistance) handlePrevMonth();
    else if (deltaX < -minSwipeDistance) handleNextMonth();
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

  
  // === [MODIFIKASI] Logika Render Utama ===
  if (staticLoading) {
    return (
      <>
        <div className="month-navigator">
          <button disabled>&lt;</button>
          <div className="month-picker-input" style={{ width: '220px' }}></div>
          <button disabled>&gt;</button>
        </div>
        <DashboardSkeleton />
      </>
    );
  }

  if (!staticLoading && accounts.length === 0) {
    return (
      <>
        <div className="month-navigator">
          <button disabled>&lt;</button>
          <div className="month-picker-input" style={{ width: '220px' }}></div>
          <button disabled>&gt;</button>
        </div>
        <WelcomeNotification />
      </>
    );
  }
  
  return (
    <>
      <div className="month-navigator">
        <button onClick={handlePrevMonth} disabled={isRefetching || !!animationClass}>&lt;</button>
        <DatePicker
          selected={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          dateFormat="MMMM yyyy"
          showMonthYearPicker
          showFullMonthYearPicker
          className="month-picker-input"
          popperPlacement="bottom"
          disabled={isRefetching || !!animationClass}
        />
        <button onClick={handleNextMonth} disabled={isRefetching || !!animationClass}>&gt;</button>
      </div>
      
      {error && <p className="error" style={{textAlign: 'center', padding: '1rem', backgroundColor: 'var(--color-bg-medium)', borderRadius: '12px'}}>{error}</p>}

      <div 
        className="dashboard-content-wrapper"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {(isMonthlyLoading || isRefetching) ? (
          <DashboardSkeleton />
        ) : (
          analytics ? (
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
                  {/* ... (Isi Budget Pocket tidak berubah) ... */}
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

                  {/* === [UI FILTER BARU] === */}
                  <div className="transaction-filters">
                    <div className="form-group">
                      <label>Tipe</label>
                      <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                        <option value="">Semua Tipe</option>
                        <option value="income">Pemasukan</option>
                        <option value="expense">Pengeluaran</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Akun</label>
                      <select value={filterAccountId} onChange={(e) => setFilterAccountId(e.target.value)}>
                        <option value="">Semua Akun</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* === [AKHIR UI FILTER] === */}

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
                              {/* [MODIFIKASI] Tampilkan akun asal, atau akun tujuan jika transfer masuk */}
                              {t.type === 'income' && t.category === 'Transfer' ? 
                                (t.destination_accounts ? ` • ${t.destination_accounts.name}` : '') :
                                (t.accounts ? ` • ${t.accounts.name}` : '')
                              }
                            </span>
                          </div>
                          <span className={t.type}>
                            {t.type === 'expense' ? '-' : '+'}
                            {formatCurrency(t.amount)}
                          </span>
                        </li>
                      ))
                    ) : (
                      <p style={{textAlign: 'center', marginTop: '1rem', color: 'var(--color-text-muted)'}}>
                        Belum ada transaksi di bulan ini (atau sesuai filter Anda).
                      </p>
                    )}
                  </ul>
                </section>

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