import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatMonthYear } from '../utils/format';

import TransactionForm from '../components/TransactionForm';
import BudgetForm from '../components/BudgetForm';
import CategoryForm from '../components/CategoryForm';

const Dashboard = () => {
  const { user, logout } = useAuth();
  
  // === [STATE BARU UNTUK BULAN] ===
  // State utama untuk bulan & tahun yang sedang dilihat
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState(null);

  // === [FUNGSI FETCHDATA DIMODIFIKASI] ===
  // Sekarang mengambil data berdasarkan selectedDate
  const fetchData = useCallback(async () => {
    setLoading(true); // Set loading=true setiap kali pindah bulan
    setError('');

    const month = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();

    try {
      const [analyticsRes, transactionsRes, categoriesRes] = await Promise.all([
        axiosClient.get('/api/analytics/summary', { params: { month, year } }),
        axiosClient.get('/api/transactions', { params: { limit: 5, month, year } }),
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
  }, [selectedDate]); // [PENTING] Jalankan ulang fungsi ini jika selectedDate berubah

  // Ambil data saat halaman dimuat & saat selectedDate berubah
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDataUpdate = () => {
    fetchData();
    setBudgetToEdit(null); 
  };

  // === [FUNGSI BARU UNTUK NAVIGASI BULAN] ===
  const handlePrevMonth = () => {
    setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
  };
  // === [AKHIR FUNGSI BARU] ===

  // === [DATA UNTUK "POCKET" BUDGET] ===
  // Kita gabungkan data budget dan data pengeluaran
  const budgetPockets = useMemo(() => {
    if (!analytics) return [];
    
    const budgetDetails = analytics.budget?.details || [];
    const expenses = analytics.expenses_by_category || {};

    // Map semua detail budget dan tambahkan info 'spent'
    const pockets = budgetDetails.map(budget => {
      const spent = expenses[budget.category_name] || 0;
      return {
        ...budget,
        spent: spent,
        remaining: budget.amount - spent,
        progress: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
      };
    });

    // [BONUS] Tampilkan juga kategori yang ada pengeluaran tapi tidak di-budget
    Object.keys(expenses).forEach(categoryName => {
      if (!pockets.find(p => p.category_name === categoryName)) {
        pockets.push({
          id: categoryName, // Pakai nama sebagai key
          category_name: categoryName,
          amount: 0, // Budget 0
          spent: expenses[categoryName],
          remaining: -expenses[categoryName],
          progress: 100 // Anggap 100% overbudget
        });
      }
    });

    return pockets;

  }, [analytics]);
  
  // Data total untuk progress bar utama
  const totalBudget = analytics?.budget?.total_amount || 0;
  const totalSpent = analytics?.summary?.total_expenses || 0;
  const totalRemaining = analytics?.budget?.remaining || 0;
  const totalProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;


  return (
    <>
      <div className="dashboard-layout">
        {/* === SIDEBAR (DESKTOP) === */}
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
          <header className="mobile-header">
            <h1>💰 Money Tracker</h1>
            <button onClick={logout} className="logout-btn-mobile">
              Logout
            </button>
          </header>

          {/* === [NAVIGATOR BULAN BARU] === */}
          <div className="month-navigator">
            <button onClick={handlePrevMonth}>&lt;</button>
            <h2>{formatMonthYear(selectedDate)}</h2>
            <button onClick={handleNextMonth}>&gt;</button>
          </div>
          
          {error && <p className="error">{error}</p>}

          {/* Tampilkan spinner jika loading, atau grid jika selesai */}
          {loading ? (
            <div className="loading-content">
              <div className="spinner"></div>
              <h2>Loading Data...</h2>
            </div>
          ) : (
            <div className="dashboard-grid">
              
              {/* --- 1. Ringkasan Finansial --- */}
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

              {/* === [KARTU BUDGET "POCKET"] === */}
              <section className="card card-budget-pocket">
                <h3>Budget Pockets</h3>
                {/* Progress Bar Total */}
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
                
                {/* Form untuk Atur Budget */}
                <BudgetForm 
                  categories={categories} 
                  onBudgetSet={handleDataUpdate}
                  budgetToEdit={budgetToEdit}
                  onClearEdit={() => setBudgetToEdit(null)}
                  selectedDate={selectedDate} // [PENTING] Kirim tanggal
                />

                {/* Grid "Pocket" */}
                <div className="pocket-grid">
                  {budgetPockets.length > 0 ? (
                    budgetPockets.map(pocket => (
                      <div 
                        className="pocket-item" 
                        key={pocket.id || pocket.category_name} 
                        onClick={() => setBudgetToEdit(pocket)}
                      >
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
              {/* === [AKHIR KARTU BUDGET] === */}

              {/* --- 3. Form Tambah Transaksi --- */}
              <section className="card card-form">
                <h3>Tambah Transaksi Baru</h3>
                <TransactionForm 
                  categories={categories} 
                  onTransactionAdded={handleDataUpdate} 
                  onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
                  selectedDate={selectedDate} // [PENTING] Kirim tanggal
                />
              </section>

              {/* --- 4. Transaksi Terakhir --- */}
              <section className="card card-list">
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

            </div>
          )}
        </main>
      </div>

      {/* === MODAL KATEGORI (Tidak berubah) === */}
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