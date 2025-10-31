import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const TransactionForm = ({ categories, onTransactionAdded, onOpenCategoryModal }) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter kategori
  const currentCategories = categories.filter(c => c.type === type);

  // Reset kategori saat tipe berubah
  useEffect(() => {
    setCategory('');
  }, [type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category && currentCategories.length > 0) {
      setError('Pilih kategori');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await axiosClient.post('/api/transactions', {
        amount: parseFloat(amount),
        category: category || (type === 'expense' ? 'Other Expenses' : 'Other Income'),
        type,
        description,
        date,
      });
      
      // Berhasil! Reset form & panggil refresh
      setAmount('');
      setCategory('');
      setDescription('');
      onTransactionAdded(); // Memberi tahu Dashboard untuk refresh data
      
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menambah transaksi');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="transaction-form">
      {error && <p className="error">{error}</p>}
      <div className="form-group-radio">
        <label>
          <input 
            type="radio" 
            value="expense" 
            checked={type === 'expense'} 
            onChange={() => setType('expense')}
          />
          Pengeluaran
        </label>
        <label>
          <input 
            type="radio" 
            value="income" 
            checked={type === 'income'} 
            onChange={() => setType('income')}
          />
          Pemasukan
        </label>
      </div>
      <div className="form-group">
        <label>Jumlah</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          required
        />
      </div>

      <div className="form-group-inline">
        <div className="form-group" style={{ flexGrow: 1 }}>
          <label>Kategori</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="" disabled>Pilih Kategori</option>
            {currentCategories.map(c => (
              <option key={c.id || c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <button 
          type="button" 
          className="btn-new-category" 
          onClick={onOpenCategoryModal}
          title="Buat Kategori Baru"
        >
          Baru +
        </button>
      </div>

      <div className="form-group">
        <label>Tanggal</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>Deskripsi (Opsional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Makan siang, Gaji, dll."
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Menyimpan...' : 'Tambah'}
      </button>
    </form>
  );
};

export default TransactionForm;