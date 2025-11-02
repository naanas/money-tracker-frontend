import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const { user } = useAuth(); // Dapatkan info user
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fungsi untuk mengambil data statis (akun & kategori)
  const fetchStaticData = useCallback(async () => {
    if (!user) return; // Jangan fetch jika user belum login
    
    setLoading(true);
    try {
      const [categoriesRes, accountsRes] = await Promise.all([
        axiosClient.get('/api/categories'),
        axiosClient.get('/api/accounts'),
      ]);
      setCategories(categoriesRes.data.data);
      setAccounts(accountsRes.data.data);
    } catch (err) {
      console.error("Failed to fetch static data:", err);
      // Anda bisa menambahkan state error di sini jika perlu
    } finally {
      setLoading(false);
    }
  }, [user]); // Hanya jalankan ulang jika user berubah (login/logout)

  // Ambil data saat provider pertama kali dimuat (setelah user login)
  useEffect(() => {
    fetchStaticData();
  }, [fetchStaticData]);

  const value = {
    accounts,
    categories,
    staticLoading: loading,
    refetchAccounts: fetchStaticData, // Beri nama ini agar jelas
    refetchCategories: fetchStaticData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider> 
  );
};