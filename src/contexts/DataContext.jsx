import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  
  // State Data Utama
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  
  // State UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fungsi untuk mengambil semua data statis
  const fetchStaticData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const [categoriesRes, savingsRes, accountsRes] = await Promise.all([
        axiosClient.get('/api/categories'),
        axiosClient.get('/api/savings'),
        axiosClient.get('/api/accounts'),
      ]);
      setCategories(categoriesRes.data.data);
      setSavingsGoals(savingsRes.data.data);
      setAccounts(accountsRes.data.data);
      
    } catch (err) {
      console.error("Failed to fetch static data:", err);
      setError(err.response?.data?.error || 'Gagal mengambil data statis');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Efek untuk mengambil data saat user login
  useEffect(() => {
    fetchStaticData();
  }, [fetchStaticData]);

  // Fungsi Refetch Terpusat
  const refetchCategories = useCallback(async () => {
    try {
      const res = await axiosClient.get('/api/categories');
      setCategories(res.data.data);
    } catch (err) { console.error("Failed to re-fetch categories:", err); }
  }, []);

  const refetchSavings = useCallback(async () => {
    try {
      const res = await axiosClient.get('/api/savings');
      setSavingsGoals(res.data.data);
    } catch (err) { console.error("Failed to re-fetch savings:", err); }
  }, []);

  const refetchAccounts = useCallback(async () => {
    try {
      const res = await axiosClient.get('/api/accounts');
      setAccounts(res.data.data);
    } catch (err) { console.error("Failed to re-fetch accounts:", err); }
  }, []);

  const value = {
    categories,
    accounts,
    savingsGoals,
    loading,
    error,
    refetchCategories,
    refetchSavings,
    refetchAccounts,
    // Fungsi untuk me-refresh semua data sekaligus
    fetchAllStaticData: fetchStaticData 
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};