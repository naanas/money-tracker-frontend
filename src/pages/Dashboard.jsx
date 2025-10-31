import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';
import { formatCurrency } from '../utils/format'; // Helper baru yang akan kita buat

// Komponen baru yang akan kita buat
import TransactionForm from '../components/TransactionForm';
import BudgetForm from '../components/BudgetForm';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fungsi untuk mengambil semua data dashboard
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Kita panggil 3 endpoint backend secara bersamaan
      const [analyticsRes, transactionsRes, categoriesRes] = await Promise.all([
        axiosClient.get('/api/analytics/summary'), // [1] Ambil ringkasan
        axiosClient.get('/api/transactions?limit=5'), // [2] Ambil 5 transaksi terakhir
        axiosClient.get('/api/categories'), // [3] Ambil daftar kategori untuk form
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

  // Ambil data saat halaman pertama kali dimuat
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fungsi ini akan dipanggil oleh komponen anak setelah berhasil
  // menambah transaksi atau budget, agar data di dashboard ter-refresh
  const handleDataUpdate = () => {
    fetchData();
  };

  if (loading) {
    return <div className="dashboard-container"><h2>Loading Dashboard...</h2></div>;
  }

  if (error) {
    return <div className="dashboard-container"><p className="error">{error}</p></div>;
  }

  // Menghitung progres budget
  const budgetAmount = analytics?.budget?.amount || 0;
  const budgetSpent = analytics?.summary?.total_expenses || 0;
  const budgetRemaining = analytics?.budget?.remaining || 0;
  const budgetProgress = budgetAmount > 0 ? (budgetSpent / budgetAmount) * 100 : 0;

  return (
    <div className="dashboard-container">
      <header>
        <h2>Dashboard</h2>
        <div>
          <span>Halo, {user?.email}</span>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      {/* === Grid Layout untuk Dashboard === */}
      <div className="dashboard-grid">

        {/* --- 1. Ringkasan Finansial --- */}
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

        {/* --- 2. Ringkasan Budget --- */}
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

        {/* --- 3. Form Tambah Transaksi --- */}
        <section className="card card-form">
          <h3>Tambah Transaksi Baru</h3>
          <TransactionForm 
            categories={categories} 
            onTransactionAdded={handleDataUpdate} 
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
                    <span>{new Date(t.date).toLocaleDateString('id-ID')}</span>
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
        <section className="card card-list">
          <h3>Pengeluaran per Kategori</h3>
          <ul>
            {analytics.expenses_by_category && Object.keys(analytics.expenses_by_category).length > 0 ? (
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
    </div>
  );
};

export default Dashboard;