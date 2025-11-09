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
  
  // Helper untuk tanggal hari ini YYYY-MM-DD
  const getTodayDateString = () => new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(getTodayDateString());
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); 
  
  // State untuk OCR + Upload
  const [receiptUrl, setReceiptUrl] = useState(null); 
  const [isProcessing, setIsProcessing] = useState(false); 
  const [processingStatus, setProcessingStatus] = useState(''); 
  
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

  // === [INISIALISASI TESSERACT DUAL BAHASA] ===
  const initializeWorker = useCallback(async () => {
    try {
      if (workerRef.current === null) { 
        setProcessingStatus('Memuat mesin OCR...');
        // Muat Bahasa Indonesia DAN Inggris agar lebih akurat membaca "Total", "Cash", dll.
        workerRef.current = await createWorker(['ind', 'eng'], 1, {
          logger: m => {
            if (m.status.includes('loading')) {
               setProcessingStatus(`Memuat model... (${Math.round(m.progress * 100)}%)`);
            } else if (m.status === 'recognizing text') {
              setProcessingStatus(`Membaca gambar... (${Math.round(m.progress * 100)}%)`);
            }
          }
        });
        setProcessingStatus(''); 
      }
    } catch (err) {
      console.error("Gagal inisialisasi OCR", err);
      setError(`Fitur OCR gagal dimuat. Coba refresh halaman.`);
      setProcessingStatus('');
    }
  }, []);

  useEffect(() => {
    initializeWorker();
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    }
  }, [initializeWorker]);

  // === [HANDLER UTAMA: SCAN & UPLOAD] ===
  const handleScanAndUpload = () => {
    if (!workerRef.current || processingStatus.includes('Memuat')) {
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
    setReceiptUrl(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${new Date().getTime()}.${fileExt}`;
      const bucketName = 'receipts';

      setProcessingStatus('Memindai & Mengupload...');

      // Jalankan Upload ke Supabase dan OCR Tesseract secara paralel
      const uploadPromise = supabase.storage.from(bucketName).upload(fileName, file);
      const ocrPromise = workerRef.current.recognize(file);

      const [uploadResult, ocrResult] = await Promise.all([uploadPromise, ocrPromise]);

      if (uploadResult.error) throw new Error(`Upload gagal: ${uploadResult.error.message}`);
      
      // Dapatkan URL publik gambar
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadResult.data.path);
      setReceiptUrl(urlData.publicUrl);

      // Proses hasil teks OCR
      setProcessingStatus('Menganalisis teks...');
      const { data: { text } } = ocrResult;
      // console.log("Raw OCR:", text); // Uncomment untuk debug hasil mentah

      const parsedData = parseReceiptText(text); 

      if (parsedData.amount === 0) {
          setError('Total belanja tidak ditemukan otomatis. Mohon isi manual.');
      } else {
          setAmount(parsedData.amount.toString());
          setProcessingStatus(`Sukses! Total terbaca: Rp ${parsedData.amount.toLocaleString('id-ID')}`);
      }

      setDescription(parsedData.description);
      // Gunakan tanggal dari struk jika ada, jika tidak gunakan hari ini
      setDate(parsedData.date || getTodayDateString());
      setType('expense'); 

    } catch (err) {
      console.error("Error proses struk:", err);
      setError(err.message || 'Gagal memproses struk.');
      setProcessingStatus('');
    }
    
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input file
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category && currentCategories.length > 0) { setError('Pilih kategori'); return; }
    if (!accountId) { setError('Pilih akun'); return; }

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
        receipt_url: receiptUrl, // Kirim URL struk (bisa null)
      });
      
      // Reset form setelah sukses
      setAmount('');
      setCategory('');
      setDescription('');
      setReceiptUrl(null);
      setProcessingStatus('');
      setDate(getTodayDateString()); // Reset tanggal ke hari ini
      onTransactionAdded(); 
      
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menambah transaksi');
    }
    setLoading(false);
  };
  
  const isLoading = loading || isRefetching || isProcessing;

  return (
    <form onSubmit={handleSubmit} className="transaction-form" style={{ position: 'relative' }}>
      {/* Overlay saat OCR berjalan */}
      {isProcessing && (
        <div className="ocr-loading-overlay">
          <div className="btn-spinner"></div>
          <p>{processingStatus || 'Memproses...'}</p>
        </div>
      )}

      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
      
      <button 
        type="button" 
        className="btn-secondary" 
        onClick={handleScanAndUpload}
        disabled={isLoading}
        style={{ marginBottom: '1rem', background: 'var(--color-bg-light)' }}
      >
        📸 Pindai / Upload Struk
      </button>

      {processingStatus && !isProcessing && !error && (
        <p className="success" style={{textAlign: 'center', margin: '-0.5rem 0 1rem 0'}}>
          {processingStatus}
        </p>
      )}

      {error && <p className="error">{error}</p>}
      
      <div className="form-group-radio">
         <label><input type="radio" value="expense" checked={type === 'expense'} onChange={() => setType('expense')}/> Pengeluaran</label>
         <label><input type="radio" value="income" checked={type === 'income'} onChange={() => setType('income')}/> Pemasukan</label>
      </div>

      <div className="form-group-inline">
        <div className="form-group" style={{ flex: 2 }}>
            <label>Akun</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                <option value="" disabled>Pilih Akun</option>
                {accounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
            </select>
        </div>
        <div className="form-group" style={{ flex: 3 }}>
            <label>Jumlah</label>
            <input type="text" inputMode="numeric" value={formatNumberInput(amount)} onChange={(e) => setAmount(parseNumberInput(e.target.value))} placeholder="0" required className="input-currency" />
        </div>
      </div>

      <div className="form-group-inline">
        <div className="form-group" style={{ flexGrow: 1 }}>
          <label>Kategori</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="" disabled>Pilih Kategori</option>
            {currentCategories.map(c => (<option key={c.id || c.name} value={c.name}>{c.name}</option>))}
          </select>
        </div>
        <button type="button" className="btn-new-category" onClick={onOpenCategoryModal} title="Buat Kategori Baru">Baru +</button>
      </div>

      <div className="form-group-inline">
          <div className="form-group" style={{flex: 1}}>
            <label>Tanggal</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="form-group" style={{flex: 2}}>
            <label>Deskripsi (Opsional)</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Makan siang, dll." />
          </div>
      </div>

      <button type="submit" disabled={isLoading}>
        {loading ? <div className="btn-spinner"></div> : 'Tambah'}
      </button>
    </form>
  );
};

export default TransactionForm;