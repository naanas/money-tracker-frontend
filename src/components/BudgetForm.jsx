import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { formatNumberInput, parseNumberInput } from '../utils/format';

// [MODIFIKASI] Ambil prop 'isRefetching'
const BudgetForm = ({ categories, onBudgetSet, selectedDate, budgetToEdit, onClearEdit, isRefetching }) => {
  const [amount, setAmount] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(false); // State loading untuk form ini sendiri
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
    const finalAmount = parseFloat(amount) || 0;

    try {
      await axiosClient.post('/api/budgets', {
        amount: finalAmount, 
        month: month,
        year: year,
        category_name: categoryName 
      });

      let successMessage = 'Budget disimpan!';
      if (finalAmount === 0 && budgetToEdit) {
        successMessage = 'Budget direset ke Rp 0!';
      } else if (budgetToEdit) {
        successMessage = 'Budget diubah!';
      }

      setMessage(successMessage);
      onBudgetSet(); // Ini akan memicu refresh + animasi sukses
      
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
        <label>Jumlah Budget (Isi 0 atau kosongkan untuk reset)</label>
        <input
          type="text" 
          inputMode="numeric"
          value={formatNumberInput(amount)} 
          onChange={(e) => setAmount(parseNumberInput(e.target.value))} 
          placeholder="0"
          className="input-currency" 
        />
      </div>

      {/* [MODIFIKASI] Tombol submit sekarang tahu state loading global */}
      <div className="form-group-inline" style={{ marginTop: '1rem' }}>
        <button type="submit" disabled={loading || isRefetching} style={{width: '100%'}}>
          {loading || isRefetching ? 'Menyimpan...' : (budgetToEdit ? 'Ubah Budget' : 'Atur Budget')}
        </button>
        {budgetToEdit && (
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onClearEdit}
            disabled={loading || isRefetching}
          >
            Batal
          </button>
        )}
      </div>
    </form>
  );
};

export default BudgetForm;