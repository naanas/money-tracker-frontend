import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatMonthYear } from '../utils/format';

import DatePicker from 'react-datepicker'; // Pastikan Anda sudah install ini
import 'react-datepicker/dist/react-datepicker.css'; // Pastikan ini di-import di main.jsx

import TransactionForm from '../components/TransactionForm';
import BudgetForm from '../components/BudgetForm';
import CategoryForm from '../components/CategoryForm';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [analytics, setAnalytics] = useState(null); // Mulai dengan null
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true); 
    setError('');
    // [PERBAIKAN] Reset analytics ke null setiap kali fetch baru
    setAnalytics(null);
    setTransactions([]);

    const month = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();

    try {
      // Kita butuh kategori dulu untuk form
      const categoriesRes = await axiosClient.get('/api/categories');
      setCategories(categoriesRes.data.data);

      // Lalu ambil data sisanya
      const [analyticsRes, transactionsRes] = await Promise.all([
        axiosClient.get('/api/analytics/summary', { params: { month, year } }),
        axiosClient.get('/api/transactions', { params: { month, year } }), 
      ]);

      setAnalytics(analyticsRes.data.data);
      setTransactions(transactionsRes.data.data.transactions);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      // [PERBAIKAN] Tampilkan error CORS-nya jika ada
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

  // ... (fungsi handlePrevMonth, handleNextMonth, handleDeleteBudget tidak berubah)
  const handlePrevMonth = () => {
    setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
  };

  const handleDeleteBudget = async (e, budgetId) => {
    e.stopPropagation(); 
    if (!window.confirm('Yakin ingin menghapus budget pocket ini?')) return;
    try {
      await axiosClient.delete(`/api/budgets/${budgetId}`);
      handleDataUpdate(); 
    } catch (err) {
      console.error("Failed to delete budget:", err);
      setError(err.response?.data?.error || 'Gagal menghapus budget');
    }
  };

  // ... (useMemo dan kalkulasi budget tidak berubah, SUDAH AMAN)
  const budgetPockets = useMemo(() => {
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
          </div>
        </aside>

        <main className="main-content">
          <header className="mobile-header">
            {/* ... (mobile header tidak berubah) ... */}
            <h1>💰 Money Tracker</h1>
            <button onClick={logout} className="logout-btn-mobile">
              Logout
            </button>
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
          
          {/* Tampilkan error di atas, BUKAN di dalam grid */}
          {error && <p className="error" style={{textAlign: 'center', padding: '1rem', backgroundColor: 'var(--color-bg-medium)', borderRadius: '12px'}}>{error}</p>}

          {loading ? (
            <div className="loading-content">
              <div className="spinner"></div>
              <h2>Loading Data...</h2>
            </div>
          ) : (
            // [PERBAIKAN] Tambahkan wrapper ini!
            // Hanya render grid jika analytics SUDAH ADA dan tidak error
            analytics && !error ? (
              <div className="dashboard-grid">
                
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
                  />
                </section>

                <section className="card card-list full-height-card">
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
              </div>
            ) : (
              // Tampilkan ini jika tidak loading TAPI analytics masih null (karena error)
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