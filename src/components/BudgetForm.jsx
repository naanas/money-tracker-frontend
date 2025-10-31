import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';

const BudgetForm = ({ onBudgetSet }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    try {
      await axiosClient.post('/api/budgets', {
        amount: parseFloat(amount),
        month: currentMonth,
        year: currentYear,
      });
      setMessage('Budget disimpan!');
      setAmount('');
      onBudgetSet(); // Memberi tahu Dashboard untuk refresh data

      setTimeout(() => setMessage(''), 2000); // Hilangkan pesan setelah 2 detik
    } catch (err) {
      setMessage(err.response?.data?.error || 'Gagal simpan budget');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="budget-form">
      <div className="form-group">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Atur Budget Baru"
          required
        />
        <button type="submit" disabled={loading}>Set</button>
      </div>
      {message && <p className="success" style={{textAlign: 'center', marginTop: '1rem', marginBottom: '0'}}>{message}</p>}
    </form>
  );
};

export default BudgetForm;