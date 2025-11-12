import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatMonthYear } from '../utils/format';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import BudgetForm from '../components/BudgetForm';
import EmptyState from '../components/EmptyState';
import CategoryForm from '../components/CategoryForm';

const LoadingSpinner = () => (
  <div className="page-spinner-container" style={{ minHeight: '50vh' }}>
    <div className="page-spinner"></div>
    <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Memuat data...</p>
  </div>
);

const Budget = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // State Data Bulanan
  const [analytics, setAnalytics] = useState(null);
  
  // Ambil data global dari Context
  const { categories, loading: dataLoading, refetchCategories } = useData();
  const { triggerSuccessAnimation } = useAuth();
  
  // State UI
  const [isLoading, setIsLoading] = useState(true); 
  const [isRefetching, setIsRefetching] = useState(false); 
  const [error, setError] = useState('');
  const [budgetToEdit, setBudgetToEdit] = useState(null);
  const [animationClass, setAnimationClass] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // --- Fungsi Data Fetching ---
  const fetchMonthlyData = useCallback(async (isRefetch = false) => {
    if (isRefetch) setIsRefetching(true);
    else setIsLoading(true);
    
    setError('');
    
    const month = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();
    const params = { month, year }; 

    if (categories.length === 0) {
      if (!dataLoading) setAnalytics(null);
      setIsLoading(false);
      setIsRefetching(false);
      return; 
    }

    try {
      const analyticsRes = await axiosClient.get('/api/analytics/summary', { params });
      setAnalytics(analyticsRes.data.data);
    } catch (err) {
      console.error("Failed to fetch monthly data:", err);
      setError(err.response?.data?.error || 'Gagal mengambil data bulanan');
    } finally {
      setIsLoading(false); 
      setIsRefetching(false);
    }
  }, [selectedDate, categories, dataLoading]); 

  useEffect(() => {
    if (!dataLoading) {
      fetchMonthlyData(false); 
    }
  }, [dataLoading, fetchMonthlyData]);

  useEffect(() => {
    if (!dataLoading) {
      fetchMonthlyData(true);
    }
  }, [selectedDate]);

  // Fungsi update data
  const handleDataUpdate = async (options = {}) => {
    await fetchMonthlyData(true); // true = refetch
    
    if (options.refetchCategories) await refetchCategories();
    
    triggerSuccessAnimation(); 
    setBudgetToEdit(null); 
  };

  // --- Memos ---
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

  // --- Variabel Ringkasan ---
  const totalBudget = analytics?.budget?.total_amount || 0;
  const totalSpent = analytics?.budget?.spent || 0;
  const totalRemaining = totalBudget - totalSpent; 
  const totalProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // --- Handlers ---
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
  
  const showSkeleton = isLoading || dataLoading;

  return (
    <>
      <h2>Anggaran Bulanan</h2>
      <p>Alokasikan dana Anda untuk setiap kategori pengeluaran.</p>

      <div className="month-navigator">
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
      
      <div 
        className={`dashboard-grid budget-layout ${animationClass}`}
        onAnimationEnd={() => setAnimationClass('')} 
      >
        {showSkeleton ? (
          <LoadingSpinner />
        ) : 
        (error) ? (
          <div className="card" style={{textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem'}}>
            <p>Tidak dapat memuat data. Silakan coba lagi.</p>
            <p><i>{error}</i></p>
          </div>
        ) :
        (
          <section className="card card-budget-pocket">
            <h3>Budget Pockets untuk {formatMonthYear(selectedDate)}</h3>
            {analytics ? (
              <>
                <div className="budget-info total">
                  <span>Total Budget: {formatCurrency(totalBudget)}</span>
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
                <EmptyState
                  title="Belum Ada Budget"
                  message="Anda belum membuat budget untuk bulan ini. Mulai atur budget untuk kategori pengeluaran Anda di atas."
                />
              )}
            </div>
          </section>
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

export default Budget;