import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
// [BARU] Impor helper format
import { formatNumberInput, parseNumberInput } from '../utils/format';

// [MODIFIKASI] Ambil prop baru: budgetToEdit dan onClearEdit
const BudgetForm = ({ categories, onBudgetSet, budgetToEdit, onClearEdit }) => {
  // State amount sekarang menyimpan string angka mentah (e.g., "2000000")
  const [amount, setAmount] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const expenseCategories = categories.filter(c => c.type === 'expense');

  // [BARU] Efek untuk mengisi form saat mode edit
  useEffect(() => {
    if (budgetToEdit) {
      // Isi form dengan data yang diklik
      setAmount(budgetToEdit.amount.toString());
      setCategoryName(budgetToEdit.category_name);
    } else {
      // Bersihkan form
      setAmount('');
      setCategoryName('');
    }
  }, [budgetToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryName) {
      setMessage('Pilih kategori dulu');
      return;
    }
    
    setLoading(true);
    setMessage('');

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    try {
      await axiosClient.post('/api/budgets', {
        amount: parseFloat(amount), // Ubah string angka mentah jadi float
        month: currentMonth,
        year: currentYear,
        category_name: categoryName 
      });

      setMessage(budgetToEdit ? 'Budget diubah!' : 'Budget disimpan!');
      onBudgetSet(); // Refresh dashboard
      // onClearEdit() akan dipanggil dari dashboard

      setTimeout(() => setMessage(''), 2000); 
    } catch (err) {
      setMessage(err.response?.data?.error || 'Gagal simpan budget');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="budget-form">
      {message && <p className={message.includes('Gagal') ? 'error' : 'success'} style={{textAlign: 'center', marginTop: '1rem', marginBottom: '0'}}>{message}</p>}
      
      <div className="form-group" style={{marginTop: '1.5rem'}}>
        <label>Kategori Pengeluaran</label>
        <select 
          value={categoryName} 
          onChange={(e) => setCategoryName(e.target.value)}
          // [BARU] Nonaktifkan pilihan kategori saat mode edit
          disabled={!!budgetToEdit}
          required
        >
          <option value="" disabled>Pilih Kategori</option>
          {expenseCategories.map(c => (
            <option key={c.id || c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>
      
      {/* === [INPUT JUMLAH DIMODIFIKASI] === */}
      <div className="form-group">
        <label>Jumlah Budget</label>
        <input
          type="text" // Ganti ke text
          inputMode="numeric" // Tampilkan keyboard angka di HP
          value={formatNumberInput(amount)} // Tampilkan format (e.g., "2.000.000")
          onChange={(e) => setAmount(parseNumberInput(e.target.value))} // Simpan angka mentah (e.g., "2000000")
          placeholder="0"
          required
          className="input-currency" // Class baru untuk styling
        />
      </div>
      {/* === [AKHIR MODIFIKASI] === */}

      {/* === [TOMBOL DIMODIFIKASI] === */}
      <div className="form-group-inline" style={{ marginTop: '1rem' }}>
        <button type="submit" disabled={loading} style={{width: '100%'}}>
          {loading ? 'Menyimpan...' : (budgetToEdit ? 'Ubah Budget' : 'Atur Budget')}
        </button>
        {/* [BARU] Tampilkan tombol Batal jika sedang mode edit */}
        {budgetToEdit && (
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onClearEdit} // Panggil fungsi clear dari dashboard
            disabled={loading}
          >
            Batal
          </button>
        )}
      </div>
      {/* === [AKHIR MODIFIKASI] === */}
    </form>
  );
};

export default BudgetForm;