// naanas/money-tracker-frontend/src/components/TransactionForm.jsx

import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { createWorker } from 'tesseract.js';
import { formatNumberInput, parseNumberInput, parseReceiptText } from '../utils/format';
// [BARU] Impor supabase client dan hook auth
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const TransactionForm = ({ categories, accounts, onTransactionAdded, onOpenCategoryModal, selectedDate, isRefetching }) => {
  const { user } = useAuth(); // <-- BARU
  
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState(''); 
  
  const getInitialDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  const [date, setDate] = useState(getInitialDate);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // [BARU] State untuk file struk yang akan di-upload
  const [receiptFile, setReceiptFile] = useState(null);
  
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState(''); 
  const fileInputRef = useRef(null); // Ref untuk OCR
  const receiptInputRef = useRef(null); // <-- BARU: Ref untuk upload struk

  const currentCategories = categories.filter(c => c.type === type && c.name !== 'Transfer');

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  useEffect(() => {
    setCategory('');
  }, [type]);

  // ... (fungsi initializeWorker, handleScanClick, handleFileChange tidak berubah) ...
  const initializeWorker = async () => {
    try {
      setOcrStatus('Memuat mesin OCR & bahasa...');
      
      workerRef.current = await createWorker('ind', 1, {
        logger: m => {
          if (m.status === 'loading language model' || m.status === 'initializing tesseract' || m.status === 'loading tesseract core') {
            setOcrStatus(`Inisialisasi... (${Math.round(m.progress * 100)}%)`);
          } else if (m.status === 'recognizing text') {
            setOcrStatus(`Membaca gambar... (${Math.round(m.progress * 100)}%)`);
          }
        }
      });
      
      setOcrStatus(''); 
    } catch (err) {
      console.error("Gagal inisialisasi worker OCR", err);
      setError("Gagal memuat fitur OCR. Coba refresh.");
      setOcrStatus('');
    }
  };

  useEffect(() => {
    initializeWorker();
    
    return () => {
      workerRef.current?.terminate();
    }
  }, []); 

  const handleScanClick = () => {
    if (!workerRef.current || ocrStatus.includes('Memuat') || ocrStatus.includes('Inisialisasi')) {
      alert("Mesin OCR sedang disiapkan... Harap tunggu sebentar.");
      return;
    }
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !workerRef.current) return;

    setIsOcrLoading(true);
    setError('');

    try {
      const { data: { text } } = await workerRef.current.recognize(file);
      
      setOcrStatus('Memproses hasil...');
      const parsedData = parseReceiptText(text); 

      setAmount(parsedData.amount.toString());
      setDescription(parsedData.description);
      setType('expense'); 

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


  // === [MODIFIKASI] Fungsi handleSubmit ===
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
    
    let uploadedReceiptUrl = null; // Tipe data URL

    try {
      // 1. Handle upload file jika ada
      if (receiptFile && user) {
        setError('Mengupload struk...'); // Tampilkan status
        
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${user.id}/${new Date().getTime()}.${fileExt}`;
        const bucketName = 'receipts'; // Ganti jika nama bucket Anda berbeda

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, receiptFile);
        
        if (uploadError) {
          // Jika upload gagal, hentikan proses
          throw new Error(`Gagal upload struk: ${uploadError.message}`);
        }

        // 2. Dapatkan URL publik dari file yang di-upload
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(uploadData.path);
        
        uploadedReceiptUrl = urlData.publicUrl;
        setError(''); // Hapus status "Mengupload"
      }

      // 3. Kirim data ke backend (termasuk URL jika ada)
      await axiosClient.post('/api/transactions', {
        amount: parseFloat(amount),
        category: category || (type === 'expense' ? 'Other Expenses' : 'Other Income'),
        type,
        description,
        date,
        account_id: accountId, 
        receipt_url: uploadedReceiptUrl, // <-- Kirim URL ke backend
      });
      
      // 4. Sukses, bersihkan form
      setAmount('');
      setCategory('');
      setDescription('');
      setReceiptFile(null); // <-- Bersihkan state file
      if (receiptInputRef.current) { // <-- Reset input file
        receiptInputRef.current.value = '';
      }
      onTransactionAdded(); 
      
    } catch (err) {
      // Tangkap error (bisa dari upload atau dari post)
      setError(err.message || err.response?.data?.error || 'Gagal menambah transaksi');
    }
    setLoading(false);
  };
  
  const isLoading = loading || isRefetching || isOcrLoading || ocrStatus.includes('Memuat') || ocrStatus.includes('Inisialisasi');

  return (
    <form onSubmit={handleSubmit} className="transaction-form" style={{ position: 'relative' }}>
      {(isOcrLoading || ocrStatus.includes('Memuat') || ocrStatus.includes('Inisialisasi')) && (
        <div className="ocr-loading-overlay">
          <div className="btn-spinner"></div>
          <p>{ocrStatus || 'Memindai Nota...'}</p>
        </div>
      )}

      {/* Input untuk OCR (tersembunyi) */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {/* Tombol untuk memicu OCR */}
      <button 
        type="button" 
        className="btn-secondary" 
        onClick={handleScanClick}
        disabled={isLoading}
        style={{ marginBottom: '1rem', background: 'var(--color-bg-light)' }}
      >
        📸 Pindai Nota (OCR)
      </button>

      {error && <p className="error">{error}</p>}
      
      {/* ... (Form radio, Akun, Jumlah, Kategori tidak berubah) ... */}
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
      
      {/* === [INPUT BARU DITAMBAHKAN DI SINI] === */}
      <div className="form-group" style={{marginBottom: '1.25rem'}}>
        <label>Lampirkan Foto Struk (Opsional)</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => setReceiptFile(e.target.files[0])}
          ref={receiptInputRef}
          disabled={isLoading}
          // Tambahkan sedikit style agar konsisten
          style={{
            backgroundColor: 'var(--color-bg-light)', 
            border: '1px solid var(--color-border)', 
            padding: '0.5rem', 
            borderRadius: 'var(--radius-medium)',
            width: '100%',
            color: 'var(--color-text-muted)',
            fontSize: '0.9rem'
          }}
        />
      </div>
      {/* === [AKHIR INPUT BARU] === */}
      
      <button type="submit" disabled={isLoading}>
        {isLoading ? <div className="btn-spinner"></div> : 'Tambah'}
      </button>
    </form>
  );
};

export default TransactionForm;