import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';
import { formatCurrency } from '../utils/format';

import TransactionForm from '../components/TransactionForm';
import BudgetForm from '../components/BudgetForm';
import CategoryForm from '../components/CategoryForm';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setError('');
    try {
      const [analyticsRes, transactionsRes, categoriesRes] = await Promise.all([
        axiosClient.get('/api/analytics/summary'),
        axiosClient.get('/api/transactions?limit=5'),
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDataUpdate = () => {
    fetchData();
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <aside className="sidebar"></aside>
        <main className="main-content">
          <h2>Loading Dashboard...</h2>
        </main>
      </div>
    );
  }

  const budgetAmount = analytics?.budget?.amount || 0;
  const budgetSpent = analytics?.summary?.total_expenses || 0;
  const budgetRemaining = analytics?.budget?.remaining || 0;
  const budgetProgress = budgetAmount > 0 ? (budgetSpent / budgetAmount) * 100 : 0;

  return (
    <>
      <div className="dashboard-layout">
        {/* === SIDEBAR (DESKTOP) === */}
        {/* Ini akan otomatis disembunyikan di HP oleh CSS baru */}
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

        {/* === KONTEN UTAMA === */}
        <main className="main-content">

          {/* === HEADER (MOBILE) === */}
          {/* Header ini hanya akan muncul di HP (diatur oleh CSS) */}
          <header className="mobile-header">
            <h1>💰 Money Tracker</h1>
            <button onClick={logout} className="logout-btn-mobile">
              Logout
            </button>
          </header>

          <h2>Dashboard</h2>
          {error && <p className="error">{error}</p>}
          
          <div className="dashboard-grid">
            {/* --- 1. Ringkasan Finansial --- */}
            {analytics && (
              <section className="card card-summary">
                <h3>Ringkasan Bulan Ini</h3>
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
            )}

            {/* --- 2. Ringkasan Budget --- */}
            {analytics && (
              <section className="card card-budget">
                <h3>Budget Bulan Ini</h3>
                <div className="budget-info">
                  <span>Terpakai: {formatCurrency(budgetSpent)}</span>
                  <span>Sisa: {formatCurrency(budgetRemaining)}</span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                  ></div>
                </div>
                <div className="budget-info total">
                  <span>Total Budget: {formatCurrency(budgetAmount)}</span>
                  <span>{budgetProgress.toFixed(0)}%</span>
                </div>
                <BudgetForm onBudgetSet={handleDataUpdate} />
              </section>
            )}

            {/* --- 3. Form Tambah Transaksi --- */}
            <section className="card card-form">
              <h3>Tambah Transaksi Baru</h3>
              <TransactionForm 
                categories={categories} 
                onTransactionAdded={handleDataUpdate} 
                onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
              />
            </section>

            {/* --- 4. Transaksi Terakhir --- */}
            <section className="card card-list">
              <h3>5 Transaksi Terakhir</h3>
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
                  <p>Belum ada transaksi.</p>
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
        </main>
      </div>

      {/* === MODAL KATEGORI (di luar layout) === */}
      {isCategoryModalOpen && (
        <CategoryForm 
          onClose={() => setIsCategoryModalOpen(false)}
          onSuccess={handleDataUpdate} // Refresh data setelah kategori baru dibuat
        />
      )}
    </>
  );
};

export default Dashboard;