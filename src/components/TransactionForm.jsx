import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
// [BARU] Impor helper format
import { formatNumberInput, parseNumberInput } from '../utils/format';

const TransactionForm = ({ categories, onTransactionAdded, onOpenCategoryModal }) => {
  // [MODIFIKASI] amount sekarang string angka mentah (e.g., "500000")
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
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
        amount: parseFloat(amount), // Ubah string angka mentah jadi float
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
        {/* ... (radio button tidak berubah) ... */}
        <label>
          <input 
            type="radio" 
            value="expense" 
            checked={type === 'expense'} 
            onChange={() => { setType('expense'); setCategory(''); }}
          />
          Pengeluaran
        </label>
        <label>
          <input 
            type="radio" 
            value="income" 
            checked={type === 'income'} 
            onChange={() => { setType('income'); setCategory(''); }}
          />
          Pemasukan
        </label>
      </div>

      {/* === [INPUT JUMLAH DIMODIFIKASI] === */}
      <div className="form-group">
        <label>Jumlah</label>
        <input
          type="text" // Ganti ke text
          inputMode="numeric" // Tampilkan keyboard angka di HP
          value={formatNumberInput(amount)} // Tampilkan format (e.g., "500.000")
          onChange={(e) => setAmount(parseNumberInput(e.target.value))} // Simpan angka mentah (e.g., "500000")
          placeholder="0"
          required
          className="input-currency" // Class baru untuk styling
        />
      </div>
      {/* === [AKHIR MODIFIKASI] === */}

      <div className="form-group-inline">
        {/* ... (dropdown kategori tidak berubah) ... */}
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
        {/* ... (input tanggal tidak berubah) ... */}
        <label>Tanggal</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        {/* ... (input deskripsi tidak berubah) ... */}
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