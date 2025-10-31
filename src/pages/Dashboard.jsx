import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatMonthYear } from '../utils/format';

// === [IMPORT BARU] ===
import DatePicker from 'react-datepicker';
// === [AKHIR IMPORT BARU] ===

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
    // ... (Fungsi fetchData Anda tidak berubah)
    setLoading(true); 
    setError('');
    const month = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();
    try {
      const [analyticsRes, transactionsRes, categoriesRes] = await Promise.all([
        axiosClient.get('/api/analytics/summary', { params: { month, year } }),
        axiosClient.get('/api/transactions', { params: { month, year } }), 
        axiosClient.get('/api/categories'),
      ]);
      setAnalytics(analyticsRes.data.data);
      setTransactions(transactionsRes.data.data.transactions);
      setCategories(categoriesRes.data.data);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError('Gagal mengambil data dashboard');
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

  const handleDeleteBudget = async (e, budgetId) => {
    // ... (Fungsi handleDeleteBudget Anda tidak berubah)
    e.stopPropagation(); 
    if (!window.confirm('Yakin ingin menghapus budget pocket ini?')) {
      return;
    }
    try {
      await axiosClient.delete(`/api/budgets/${budgetId}`);
      handleDataUpdate(); 
    } catch (err) {
      console.error("Failed to delete budget:", err);
      setError(err.response?.data?.error || 'Gagal menghapus budget');
    }
  };

  const budgetPockets = useMemo(() => {
    // ... (Fungsi useMemo Anda tidak berubah)
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
        {/* ... (Sidebar Anda tidak berubah) ... */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1>💰 Money Tracker</h1>
          </div>
          <div className="sidebar-footer">
            <div className="user-info">{user?.email}</div>
            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          </div>
        </aside>

        <main className="main-content">
          {/* ... (Mobile header tidak berubah) ... */}
          <header className="mobile-header">
            <h1>💰 Money Tracker</h1>
            <button onClick={logout} className="logout-btn-mobile">
              Logout
            </button>
          </header>

          {/* === [NAVIGATOR BULAN DIMODIFIKASI] === */}
          <div className="month-navigator">
            <button onClick={handlePrevMonth}>&lt;</button>
            {/* Ganti <h2> dengan <DatePicker> */}
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              dateFormat="MMMM yyyy"
              showMonthYearPicker
              showFullMonthYearPicker
              className="month-picker-input" // Class custom untuk styling
              popperPlacement="bottom"
            />
            <button onClick={handleNextMonth}>&gt;</button>
          </div>
          {/* === [AKHIR MODIFIKASI] === */}
          
          {error && <p className="error">{error}</p>}

          {loading ? (
            <div className="loading-content">
              <div className="spinner"></div>
              <h2>Loading Data...</h2>
            </div>
          ) : (
            <div className="dashboard-grid">
              
              {/* --- 1. Ringkasan Finansial --- */}
              <section className="card card-summary">
                {/* [MODIFIKASI] Judul kartu dinamis */}
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

              {/* --- 2. Budget Pockets --- */}
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

              {/* --- 3. Form Tambah Transaksi --- */}
              <section className="card card-form">
                <h3>Tambah Transaksi Baru</h3>
                <TransactionForm 
                  categories={categories} 
                  onTransactionAdded={handleDataUpdate} 
                  onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
                  selectedDate={selectedDate}
                />
              </section>

              {/* --- 4. Daftar Transaksi --- */}
              <section className="card card-list full-height-card">
                {/* [MODIFIKASI] Judul kartu dinamis */}
                <h3>Transaksi {formatMonthYear(selectedDate)}</h3>
                <ul>
                  {transactions.length > 0 ? (
                    transactions.map((t) => (
                      <li key={t.id} className="list-item">
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

              {/* --- 5. Pengeluaran per Kategori --- */}
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