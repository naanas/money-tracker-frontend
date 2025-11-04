// naanas/money-tracker-frontend/src/components/TransactionForm.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import { createWorker } from 'tesseract.js';
import { formatNumberInput, parseNumberInput, parseReceiptText } from '../utils/format';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const TransactionForm = ({ categories, accounts, onTransactionAdded, onOpenCategoryModal, selectedDate, isRefetching }) => {
  const { user } = useAuth(); 
  
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
  const [loading, setLoading] = useState(false); // Loading untuk submit
  
  // === [STATE BARU UNTUK FLOW GABUNGAN] ===
  // State untuk URL struk yang berhasil di-upload
  const [receiptUrl, setReceiptUrl] = useState(null); 
  // State untuk loading OCR + Upload
  const [isProcessing, setIsProcessing] = useState(false); 
  const [processingStatus, setProcessingStatus] = useState(''); 
  // ==========================================
  
  const fileInputRef = useRef(null); 
  const workerRef = useRef(null);

  const currentCategories = categories.filter(c => c.type === type && c.name !== 'Transfer');

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  useEffect(() => {
    setCategory('');
  }, [type]);

  // === [PERBAIKAN BUG OCR] ===
  const initializeWorker = useCallback(async () => {
    try {
      // Hanya inisialisasi jika workerRef.current belum ada
      if (workerRef.current === null) { 
        setProcessingStatus('Memuat mesin OCR...');
        workerRef.current = await createWorker('ind', 1, {
          logger: m => {
            if (m.status === 'loading language model' || m.status === 'initializing tesseract' || m.status === 'loading tesseract core') {
              setProcessingStatus(`Inisialisasi... (${Math.round(m.progress * 100)}%)`);
            } else if (m.status === 'recognizing text') {
              setProcessingStatus(`Membaca gambar... (${Math.round(m.progress * 100)}%)`);
            }
          }
        });
        setProcessingStatus(''); 
      }
    } catch (err) {
      console.error("Gagal inisialisasi worker OCR", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Gagal memuat fitur OCR: ${errorMsg}. Coba refresh.`);
      setProcessingStatus('');
    }
  }, []); // Dependensi kosong, hanya dibuat sekali

  useEffect(() => {
    initializeWorker();
    
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null; // Set ke null saat unmount
    }
  }, [initializeWorker]); 
  // === [AKHIR PERBAIKAN BUG OCR] ===


  // === [LOGIKA UTAMA YANG BARU: GABUNGAN OCR + UPLOAD] ===
  const handleScanAndUpload = () => {
    if (!workerRef.current || processingStatus.includes('Memuat') || processingStatus.includes('Inisialisasi')) {
      alert("Mesin OCR sedang disiapkan... Harap tunggu sebentar.");
      return;
    }
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !workerRef.current || !user) return;

    setIsProcessing(true);
    setError('');
    setReceiptUrl(null); // Reset URL sebelumnya

    try {
      // Siapkan nama file unik untuk Supabase
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${new Date().getTime()}.${fileExt}`;
      const bucketName = 'receipts';

      // Jalankan KEDUA proses secara paralel
      setProcessingStatus('Memindai & Mengupload...');

      const uploadPromise = supabase.storage
        .from(bucketName)
        .upload(fileName, file);
      
      const ocrPromise = workerRef.current.recognize(file);

      // Tunggu keduanya selesai
      const [uploadResult, ocrResult] = await Promise.all([uploadPromise, ocrPromise]);

      // --- Proses Hasil Upload ---
      if (uploadResult.error) {
        throw new Error(`Gagal upload struk: ${uploadResult.error.message}`);
      }
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uploadResult.data.path);
      
      setReceiptUrl(urlData.publicUrl); // Simpan URL untuk di-submit

      // --- Proses Hasil OCR ---
      const { data: { text } } = ocrResult;
      setProcessingStatus('Memproses hasil...');
      const parsedData = parseReceiptText(text); 

      setAmount(parsedData.amount.toString());
      setDescription(parsedData.description);
      setType('expense'); 

      setProcessingStatus('Sukses! Data terisi dan struk tersimpan.');

    } catch (err) {
      console.error("Gagal memproses struk:", err);
      setError(err.message || 'Gagal memproses struk. Coba lagi.');
      setProcessingStatus(''); // Hapus status jika error
    }
    
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Selalu reset input file
    }
  };
  // === [AKHIR LOGIKA UTAMA] ===


  // === [MODIFIKASI] handleSubmit sekarang lebih sederhana ===
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

    setLoading(true); // Gunakan loading submit
    setError('');
    
    try {
      // Langsung kirim data ke backend, termasuk receiptUrl (bisa null jika tidak ada)
      await axiosClient.post('/api/transactions', {
        amount: parseFloat(amount),
        category: category || (type === 'expense' ? 'Other Expenses' : 'Other Income'),
        type,
        description,
        date,
        account_id: accountId, 
        receipt_url: receiptUrl, // Kirim URL yang sudah disimpan di state
      });
      
      // Sukses, bersihkan form
      setAmount('');
      setCategory('');
      setDescription('');
      setReceiptUrl(null); // Bersihkan state URL
      setProcessingStatus(''); // Bersihkan status upload/scan
      onTransactionAdded(); 
      
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menambah transaksi');
    }
    setLoading(false);
  };
  
  // Gabungkan semua kondisi loading
  const isLoading = loading || isRefetching || isProcessing;

  return (
    <form onSubmit={handleSubmit} className="transaction-form" style={{ position: 'relative' }}>
      {isProcessing && ( // Ganti overlay loading
        <div className="ocr-loading-overlay">
          <div className="btn-spinner"></div>
          <p>{processingStatus || 'Memproses...'}</p>
        </div>
      )}

      {/* === [MODIFIKASI] Hanya satu input file === */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {/* === [MODIFIKASI] Hanya satu tombol === */}
      <button 
        type="button" 
        className="btn-secondary" 
        onClick={handleScanAndUpload}
        disabled={isLoading}
        style={{ marginBottom: '1rem', background: 'var(--color-bg-light)' }}
      >
        📸 Pindai / Upload Struk
      </button>

      {/* Tampilkan pesan status jika ada (bukan error) */}
      {processingStatus && !isProcessing && !error && (
        <p className="success" style={{textAlign: 'center', margin: '-0.5rem 0 1rem 0'}}>
          {processingStatus}
        </p>
      )}

      {error && <p className="error">{error}</p>}
      
      {/* ... (Sisa form tidak berubah) ... */}
      
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
      
      {/* === [MODIFIKASI] Input file manual dihapus === */}
      {/* Input file manual tidak diperlukan lagi */}
      
      <button type="submit" disabled={isLoading}>
        {loading ? <div className="btn-spinner"></div> : 'Tambah'}
      </button>
    </form>
  );
};

export default TransactionForm;