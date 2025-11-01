// naanas/money-tracker-frontend/src/components/TransactionForm.jsx

import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
// [MODIFIKASI] Impor Tesseract dan parser
import { createWorker } from 'tesseract.js';
import { formatNumberInput, parseNumberInput, parseReceiptText } from '../utils/format';

const TransactionForm = ({ categories, accounts, onTransactionAdded, onOpenCategoryModal, selectedDate, isRefetching }) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState(''); 
  
  const getInitialDate = () => {
    const today = new Date();
    const targetDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), today.getDate());
    return targetDate.toISOString().split('T')[0];
  };
  const [date, setDate] = useState(getInitialDate());

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // === [KODE BARU UNTUK OCR] ===
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState(''); // Untuk menampilkan progres
  const fileInputRef = useRef(null);
  // === [AKHIR KODE BARU] ===

  const currentCategories = categories.filter(c => c.type === type && c.name !== 'Transfer');

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  useEffect(() => {
    setDate(getInitialDate());
  }, [selectedDate]);

  useEffect(() => {
    setCategory('');
  }, [type]);

  // === [FUNGSI BARU UNTUK OCR] ===
  const handleScanClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsOcrLoading(true);
    setError('');

    try {
      setOcrStatus('Memuat mesin OCR...');
      const worker = await createWorker({
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrStatus(`Membaca gambar... (${Math.round(m.progress * 100)}%)`);
          }
        },
      });

      setOcrStatus('Memuat bahasa (INA)...');
      await worker.loadLanguage('ind'); // Bahasa Indonesia
      await worker.initialize('ind');

      setOcrStatus('Mengenali teks...');
      const { data: { text } } = await worker.recognize(file);
      
      setOcrStatus('Memproses hasil...');
      // Panggil parser kita
      const parsedData = parseReceiptText(text);

      // Isi form
      setAmount(parsedData.amount.toString());
      setDescription(parsedData.description);
      setType('expense'); // Nota biasanya pengeluaran

      await worker.terminate();
      setOcrStatus('');

    } catch (err) {
      console.error(err);
      setError('Gagal memindai nota. Coba lagi.');
      setOcrStatus('');
    }
    
    setIsOcrLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  // === [AKHIR FUNGSI BARU] ===

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category && currentCategories.length > 0) {
      setError('Pilih kategori');
      return;
    }
    if (!accountId) { 
      setError('Pilih akun');
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
        account_id: accountId, 
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
  
  const isLoading = loading || isRefetching || isOcrLoading;

  return (
    <form onSubmit={handleSubmit} className="transaction-form" style={{ position: 'relative' }}>
      {/* [MODIFIKASI] Tampilkan overlay loading OCR dengan status */}
      {isOcrLoading && (
        <div className="ocr-loading-overlay">
          <div className="btn-spinner"></div>
          <p>{ocrStatus || 'Memindai Nota...'}</p>
        </div>
      )}

      {/* === [UI BARU UNTUK OCR] === */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button 
        type="button" 
        className="btn-secondary" 
        onClick={handleScanClick}
        disabled={isLoading}
        style={{ marginBottom: '1rem', background: 'var(--color-bg-light)' }}
      >
        📸 Pindai Nota (Gratis)
      </button>
      {/* === [AKHIR UI BARU] === */}

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

      <div className="form-group-inline">
        <div className="form-group" style={{ flex: 2 }}>
            <label>Akun</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                <option value="" disabled>Pilih Akun</option>
                {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
            </select>
        </div>
        <div className="form-group" style={{ flex: 3 }}>
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

      <div className="form-group-inline">
          <div className="form-group" style={{flex: 1}}>
            <label>Tanggal</label>
            <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            />
          </div>
          <div className="form-group" style={{flex: 2}}>
            <label>Deskripsi (Opsional)</label>
            <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Makan siang, Gaji, dll."
            />
          </div>
      </div>
      
      <button type="submit" disabled={isLoading}>
        {isLoading ? <div className="btn-spinner"></div> : 'Tambah'}
      </button>
    </form>
  );
};

export default TransactionForm;