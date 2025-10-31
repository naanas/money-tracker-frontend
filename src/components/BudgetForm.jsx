import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { formatNumberInput, parseNumberInput } from '../utils/format';

const BudgetForm = ({ categories, onBudgetSet, selectedDate, budgetToEdit, onClearEdit }) => {
  const [amount, setAmount] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const expenseCategories = categories.filter(c => c.type === 'expense');

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

    const month = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();

    // === [MODIFIKASI LOGIKA RESET] ===
    // Jika amount kosong atau 0, kirim 0. Ini akan me-reset/menghapus budget.
    const finalAmount = parseFloat(amount) || 0;
    // === [AKHIR MODIFIKASI] ===

    try {
      await axiosClient.post('/api/budgets', {
        amount: finalAmount, // Kirim 0 jika dikosongkan
        month: month,
        year: year,
        category_name: categoryName 
      });

      // [MODIFIKASI] Pesan yang lebih jelas
      let successMessage = 'Budget disimpan!';
      if (finalAmount === 0 && budgetToEdit) {
        successMessage = 'Budget direset!';
      } else if (budgetToEdit) {
        successMessage = 'Budget diubah!';
      }

      setMessage(successMessage);
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
      
      <div className="form-group" style={{marginTop: '1.5rem'}}>
        <label>Kategori Pengeluaran</label>
        <select 
          value={categoryName} 
          onChange={(e) => setCategoryName(e.target.value)}
          disabled={!!budgetToEdit} 
          required
        >
          <option value="" disabled>Pilih Kategori</option>
          {expenseCategories.map(c => (
            <option key={c.id || c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>
      
      <div className="form-group">
        <label>Jumlah Budget (Isi 0 untuk reset/hapus)</label>
        <input
          type="text" 
          inputMode="numeric"
          value={formatNumberInput(amount)} 
          onChange={(e) => setAmount(parseNumberInput(e.target.value))} 
          placeholder="0"
          // [MODIFIKASI] Hapus 'required' agar bisa dikosongkan
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