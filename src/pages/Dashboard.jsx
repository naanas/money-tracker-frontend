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
import TransferForm from '../components/TransferForm'; // [BARU]
import AccountSummary from '../components/AccountSummary'; // [BARU]

const Dashboard = () => {
  const { triggerSuccessAnimation } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // State Data Utama
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]); // [BARU]
  const [allSavingsGoals, setAllSavingsGoals] = useState([]); 
  
  // State UI
  const [isLoading, setIsLoading] = useState(true); 
  const [isRefetching, setIsRefetching] = useState(false); 
  const [error, setError] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState(null);
  const isInitialMount = useRef(true); 

  // === [BLOK DATA FETCHING (Menggunakan Pola dari Refaktor Sebelumnya)] ===

  // Fungsi untuk mengambil data bulanan (Analytics + Transaksi)
  const fetchMonthlyData = useCallback(async () => {
    if (isInitialMount.current) {
      setIsLoading(true); 
      isInitialMount.current = false;
    } else {
      setIsRefetching(true);
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
      setIsLoading(false); 
      setIsRefetching(false);
    }
  }, [selectedDate]); 

  // Fungsi untuk mengambil data statis (Kategori + Tabungan + Akun)
  const fetchStaticData = useCallback(async () => {
    try {
      const [categoriesRes, savingsRes, accountsRes] = await Promise.all([
        axiosClient.get('/api/categories'),
        axiosClient.get('/api/savings'),
        axiosClient.get('/api/accounts'), // [BARU]
      ]);
      setCategories(categoriesRes.data.data);
      setAllSavingsGoals(savingsRes.data.data);
      setAccounts(accountsRes.data.data); // [BARU]
    } catch (err) {
      console.error("Failed to fetch static data:", err);
      setError(err.response?.data?.error || 'Gagal mengambil data statis');
    }
  }, []);

  // EFEK 1: Ambil data statis SEKALI
  useEffect(() => {
    fetchStaticData();
  }, [fetchStaticData]);

  // EFEK 2: Ambil data bulanan saat TANGGAL atau data STATIS berubah
  useEffect(() => {
    // Jangan fetch jika data statis (terutama kategori/akun) belum siap
    if (categories.length === 0 || accounts.length === 0) return;
    
    fetchMonthlyData();
  }, [selectedDate, categories, accounts, fetchMonthlyData]); 

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
    // options: { refetchCategories, refetchSavings, refetchAccounts }
    setIsRefetching(true); // Mulai loading senyap

    // Selalu ambil ulang data bulanan
    await fetchMonthlyData(); 
    
    // Ambil ulang data statis HANYA jika diminta
    if (options.refetchCategories) await refetchCategories();
    if (options.refetchSavings) await refetchSavings();
    // [BARU] Jika ada transaksi/transfer, saldo akun PASTI berubah
    if (options.refetchAccounts) await refetchAccounts();
    
    triggerSuccessAnimation(); 
    setBudgetToEdit(null); 
    setIsRefetching(false); // Selesai
  };

  // === [AKHIR BLOK DATA FETCHING] ===

  // Memo untuk total saldo
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + parseFloat(acc.current_balance), 0);
  }, [accounts]);

  // Memo untuk filter tabungan (tidak berubah)
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

  // Memo untuk budget pockets (tidak berubah, sudah dibersihkan di refaktor sebelumnya)
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

  // Variabel ringkasan (tidak berubah, sudah dibersihkan di refaktor sebelumnya)
  const totalIncome = analytics?.summary?.total_income || 0;
  const totalExpensesFiltered = analytics?.summary?.total_expenses || 0;
  const totalTransferredToSavings = analytics?.summary?.total_transferred_to_savings || 0;
  const totalBudget = analytics?.budget?.total_amount || 0;
  const totalSpent = totalExpensesFiltered;
  const totalRemaining = totalBudget - totalSpent; 
  const totalProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const currentBalance = totalIncome - totalSpent; // Sisa uang bulan ini

  // Handler (Navigasi, Delete)
  const handlePrevMonth = () => {
    setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
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
      handleDataUpdate({ refetchAccounts: true, refetchSavings: true }); // [MODIFIKASI]
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menghapus transaksi');
      setIsRefetching(false);
    }
  };
  
  return (
    <>
      {/* Sidebar dan Header dipindah ke MainLayout.jsx */}
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

              {/* [BARU] Kartu Akun */}
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
                      {/* ... (isi pocket-item tidak berubah) ... */}
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
                  accounts={accounts} // [BARU]
                  onTransactionAdded={() => handleDataUpdate({ refetchAccounts: true })} // [MODIFIKASI]
                  onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
                  selectedDate={selectedDate}
                  isRefetching={isRefetching} 
                />
              </section>

              {/* [BARU] Form Transfer */}
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
                accounts={accounts} // [BARU]
                onDataUpdate={() => handleDataUpdate({ refetchSavings: true, refetchAccounts: true })} // [MODIFIKASI]
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
                          {/* [BARU] Tampilkan nama akun */}
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