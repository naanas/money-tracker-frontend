import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { formatNumberInput, parseNumberInput } from '../utils/format';

// [MODIFIKASI] Ambil prop baru: selectedDate, budgetToEdit, onClearEdit
const BudgetForm = ({ categories, onBudgetSet, selectedDate, budgetToEdit, onClearEdit }) => {
  const [amount, setAmount] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const expenseCategories = categories.filter(c => c.type === 'expense');

  // Efek untuk mengisi form saat mode edit
  useEffect(() => {
    if (budgetToEdit) {
      setAmount(budgetToEdit.amount.toString());
      setCategoryName(budgetToEdit.category_name);
    } else {
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

    // === [MODIFIKASI] ===
    // Gunakan month/year dari selectedDate, BUKAN new Date()
    const month = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();
    // === [AKHIR MODIFIKASI] ===

    try {
      await axiosClient.post('/api/budgets', {
        amount: parseFloat(amount) || 0, // Kirim 0 jika dikosongkan (untuk hapus/reset)
        month: month,
        year: year,
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
      {message && <p className={message.includes('Gagal') ? 'error' : 'success'} style={{textAlign: 'center', margin: '0 0 1rem 0'}}>{message}</p>}
      
      <div className="form-group">
        <label>Kategori Pengeluaran</label>
        <select 
          value={categoryName} 
          onChange={(e) => setCategoryName(e.target.value)}
          disabled={!!budgetToEdit} // Nonaktifkan saat mode edit
          required
        >
          <option value="" disabled>Pilih Kategori</option>
          {expenseCategories.map(c => (
            <option key={c.id || c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>
      
      <div className="form-group">
        <label>Jumlah Budget (Kosongkan untuk hapus)</label>
        <input
          type="text" 
          inputMode="numeric"
          value={formatNumberInput(amount)} 
          onChange={(e) => setAmount(parseNumberInput(e.target.value))} 
          placeholder="0"
          className="input-currency" 
        />
      </div>

      <div className="form-group-inline" style={{ marginTop: '1rem' }}>
        <button type="submit" disabled={loading} style={{width: '100%'}}>
          {loading ? 'Menyimpan...' : (budgetToEdit ? 'Ubah Budget' : 'Atur Budget')}
        </button>
        {budgetToEdit && (
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onClearEdit}
            disabled={loading}
          >
            Batal
          </button>
        )}
      </div>
    </form>
  );
};

export default BudgetForm;