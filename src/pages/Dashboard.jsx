import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatMonthYear } from '../utils/format';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import TransactionForm from '../components/TransactionForm';
import BudgetForm from '../components/BudgetForm';
import CategoryForm from '../components/CategoryForm';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState(null);

  const fetchData = useCallback(async () => {
    // ... (fungsi fetchData tidak berubah)
    setLoading(true); 
    setError('');
    setAnalytics(null);
    setTransactions([]);
    const month = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();
    try {
      const categoriesRes = await axiosClient.get('/api/categories');
      setCategories(categoriesRes.data.data);
      const [analyticsRes, transactionsRes] = await Promise.all([
        axiosClient.get('/api/analytics/summary', { params: { month, year } }),
        axiosClient.get('/api/transactions', { params: { month, year } }), 
      ]);
      setAnalytics(analyticsRes.data.data);
      setTransactions(transactionsRes.data.data.transactions);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err.response?.data?.error || err.message || 'Gagal mengambil data dashboard');
    }
    setLoading(false);
  }, [selectedDate]); 

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDataUpdate = () => {
    fetchData();
    setBudgetToEdit(null); 
  };

  const handlePrevMonth = () => {
    setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
  };

  // === [FUNGSI DELETE BUDGET DIMODIFIKASI] ===
  const handleDeleteBudget = async (e, budgetId) => {
    e.stopPropagation(); // Hentikan event agar tidak memicu onClick edit
    
    // [MODIFIKASI] Peringatan baru yang lebih jelas
    if (!window.confirm('PERINGATAN!\n\nYakin ingin menghapus budget pocket ini? \n\nINI JUGA AKAN MENGHAPUS SEMUA TRANSAKSI di kategori ini untuk bulan yang sama.')) {
      return;
    }

    setError('');
    try {
      // Panggil endpoint DELETE baru di backend
      await axiosClient.delete(`/api/budgets/${budgetId}`);
      handleDataUpdate(); // Refresh semua data
    } catch (err) {
      console.error("Failed to delete budget:", err);
      setError(err.response?.data?.error || 'Gagal menghapus budget');
    }
  };
  // === [AKHIR MODIFIKASI] ===

  const handleDeleteTransaction = async (transactionId) => {
    // ... (fungsi ini tidak berubah)
    if (!window.confirm('Yakin ingin menghapus transaksi ini?')) {
      return;
    }
    setError('');
    try {
      await axiosClient.delete(`/api/transactions/${transactionId}`);
      handleDataUpdate(); 
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      setError(err.response?.data?.error || 'Gagal menghapus transaksi');
    }
  };

  const handleResetTransactions = async () => {
    // ... (fungsi ini tidak berubah)
    setError('');
    const pass = prompt('Ini akan MENGHAPUS SEMUA data transaksi Anda.\nKetik "RESET" untuk konfirmasi:');
    if (pass !== 'RESET') {
      alert('Reset dibatalkan.');
      return;
    }
    setLoading(true);
    try {
      await axiosClient.delete('/api/transactions/reset');
      handleDataUpdate(); 
    } catch (err) {
      console.error("Failed to reset transactions:", err);
      setError(err.response?.data?.error || 'Gagal mereset transaksi');
      setLoading(false); 
    }
  };

  const budgetPockets = useMemo(() => {
    // ... (fungsi ini tidak berubah)
    if (!analytics) return [];
    const budgetDetails = analytics.budget?.details || [];
    const expenses = analytics.expenses_by_category || {};
    const pockets = budgetDetails.map(budget => {
      const spent = expenses[budget.category_name] || 0;
      return {
        ...budget,
        spent: spent,
        remaining: budget.amount - spent,
        progress: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
      };
    });
    Object.keys(expenses).forEach(categoryName => {
      if (!pockets.find(p => p.category_name === categoryName)) {
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
  const totalRemaining = analytics?.budget?.remaining || 0;
  const totalProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;


  return (
    <>
      <div className="dashboard-layout">
        <aside className="sidebar">
          {/* ... (sidebar tidak berubah) ... */}
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
            {/* ... (header mobile tidak berubah) ... */}
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
            {/* ... (navigator bulan tidak berubah) ... */}
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

          {loading ? (
            <div className="loading-content">
              {/* ... (loading spinner tidak berubah) ... */}
              <div className="spinner"></div>
              <h2>Loading Data...</h2>
            </div>
          ) : (
            analytics && !error ? (
              <div className="dashboard-grid">
                
                {/* --- Kartu-kartu --- */}
                {/* (Tidak ada perubahan di JSX kartu, hanya fungsi delete-nya saja) */}
                
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
                      style={{ width: `${Math.min(totalProgress, 100)}%` }}
                    ></div>
                  </div>
                  
                  <BudgetForm 
                    categories={categories} 
                    onBudgetSet={handleDataUpdate}
                    budgetToEdit={budgetToEdit}
                    onClearEdit={() => setBudgetToEdit(null)}
                    selectedDate={selectedDate} 
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
                              onClick={(e) => handleDeleteBudget(e, pocket.id)} // [LOGIKA BARU]
                              title="Hapus Budget & Transaksi Terkait"
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
                  />
                </section>

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

              </div>
            ) : (
              !loading && error && (
                <div style={{textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem'}}>
                  <p>Tidak dapat memuat data. Silakan coba lagi.</p>
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