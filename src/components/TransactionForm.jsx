import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { formatNumberInput, parseNumberInput } from '../utils/format';

// [MODIFIKASI] Ambil prop 'selectedDate'
const TransactionForm = ({ categories, onTransactionAdded, onOpenCategoryModal, selectedDate }) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [description, setDescription] = useState('');
  
  // === [MODIFIKASI STATE TANGGAL] ===
  // Fungsi untuk membuat tanggal hari ini TAPI di bulan & tahun yang dipilih
  const getInitialDate = () => {
    const today = new Date();
    const targetDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), today.getDate());
    return targetDate.toISOString().split('T')[0];
  };

  const [date, setDate] = useState(getInitialDate());

  // Update tanggal jika bulan diganti
  useEffect(() => {
    setDate(getInitialDate());
  }, [selectedDate]);
  // === [AKHIR MODIFIKASI] ===


  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const currentCategories = categories.filter(c => c.type === type);

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
      
      setAmount('');
      setCategory('');
      setDescription('');
      onTransactionAdded(); 
      
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
          type="text" 
          inputMode="numeric"
          value={formatNumberInput(amount)} 
          onChange={(e) => setAmount(parseNumberInput(e.target.value))} 
          placeholder="0"
          required
          className="input-currency" 
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