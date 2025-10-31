import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';

// [MODIFIKASI] Ambil prop 'categories'
const BudgetForm = ({ categories, onBudgetSet }) => {
  const [amount, setAmount] = useState('');
  const [categoryName, setCategoryName] = useState(''); // [BARU] State untuk kategori
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Filter agar hanya kategori PENGELUARAN yang bisa di-budget
  const expenseCategories = categories.filter(c => c.type === 'expense');

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
      // [MODIFIKASI] Kirim category_name ke backend
      await axiosClient.post('/api/budgets', {
        amount: parseFloat(amount),
        month: currentMonth,
        year: currentYear,
        category_name: categoryName 
      });

      setMessage('Budget disimpan!');
      setAmount('');
      setCategoryName(''); // Reset form
      onBudgetSet(); // Memberi tahu Dashboard untuk refresh data

      setTimeout(() => setMessage(''), 2000); 
    } catch (err) {
      setMessage(err.response?.data?.error || 'Gagal simpan budget');
    }
    setLoading(false);
  };

  return (
    // [MODIFIKASI] Ganti form-nya
    <form onSubmit={handleSubmit} className="budget-form">
      {message && <p className={message.includes('gagal') ? 'error' : 'success'} style={{textAlign: 'center', marginTop: '1rem', marginBottom: '0'}}>{message}</p>}
      
      <div className="form-group" style={{marginTop: '1.5rem'}}>
        <label>Kategori Pengeluaran</label>
        <select value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required>
          <option value="" disabled>Pilih Kategori</option>
          {expenseCategories.map(c => (
            <option key={c.id || c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>
      
      <div className="form-group">
        <label>Jumlah Budget</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          required
        />
      </div>
      <button type="submit" disabled={loading} style={{width: '100%'}}>
        {loading ? 'Menyimpan...' : 'Atur / Ubah Budget'}
      </button>
    </form>
  );
};

export default BudgetForm;