// naanas/money-tracker-frontend/src/components/TransactionForm.jsx

import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { formatNumberInput, parseNumberInput } from '../utils/format';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const TransactionForm = ({ categories, accounts, onTransactionAdded, onOpenCategoryModal, selectedDate, isRefetching }) => {
  const { user } = useAuth(); 
  
  // --- STATE FORM UTAMA ---
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState(''); 
  
  // Helper tanggal hari ini (YYYY-MM-DD)
  const getTodayDateString = () => new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(getTodayDateString());
  
  // --- STATE UI & LOADING ---
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); 
  const [receiptUrl, setReceiptUrl] = useState(null); 
  const [isProcessing, setIsProcessing] = useState(false); 
  const [processingStatus, setProcessingStatus] = useState(''); 
  
  const fileInputRef = useRef(null); 

  const currentCategories = categories.filter(c => c.type === type && c.name !== 'Transfer');

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  useEffect(() => {
    setCategory('');
  }, [type]);

  const handleScanClick = () => {
    fileInputRef.current.click();
  };

  // === LOGIKA UTAMA SCAN ===
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setIsProcessing(true);
    setError('');
    setProcessingStatus('Memulai proses...');

    try {
      // 1. Upload ke Supabase
      setProcessingStatus('Mengupload struk...');
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const bucketName = 'receipts';

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file);

      if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uploadData.path);
      const publicUrl = urlData.publicUrl;
      setReceiptUrl(publicUrl);

      // 2. Panggil API Python
      setProcessingStatus('🤖 AI sedang membaca struk...');
      const API_URL = import.meta.env.VITE_PYTHON_API_URL; 
      if (!API_URL) throw new Error("URL API Python belum disetting di .env");

      const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: publicUrl })
      });

      if (!response.ok) throw new Error(`Gagal menghubungi API AI: ${response.statusText}`);

      const result = await response.json();

      if (result.success && result.data) {
          // Ambil data hasil scan
          const { total, date: detectedDate, merchant } = result.data;

          // --- AUTO-FILL LOGIC DI SINI ---
          
          // 1. Isi Jumlah
          if (total > 0) {
              setAmount(total.toString());
              setProcessingStatus(`✅ Sukses! Total: Rp ${total.toLocaleString('id-ID')}`);
          } else {
              setProcessingStatus('⚠️ Struk terbaca, tapi total tidak ditemukan otomatis.');
          }

          // 2. Isi Tanggal (Jika ditemukan di struk)
          if (detectedDate) {
              setDate(detectedDate);
          }

          // 3. Isi Deskripsi (Nama Toko)
          if (merchant && merchant !== "Merchant" && merchant !== "Tidak diketahui") {
              // Bersihkan nama merchant dari karakter aneh jika ada
              const cleanMerchant = merchant.replace(/[^a-zA-Z0-9\s.,&-]/g, '').trim();
              setDescription(`Belanja di ${cleanMerchant}`);
          } else {
              setDescription('Belanja harian');
          }

          setType('expense'); 
      }

    } catch (err) {
      console.error("Error processing receipt:", err);
      setError(err.message || 'Gagal memproses struk.');
      setProcessingStatus('');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
        receipt_url: receiptUrl,
      });
      
      setAmount('');
      setCategory('');
      setDescription('');
      setReceiptUrl(null);
      setProcessingStatus('');
      setDate(getTodayDateString()); 
      onTransactionAdded(); 
      
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menambah transaksi');
    } finally {
      setLoading(false);
    }
  };
  
  const isLoading = loading || isRefetching || isProcessing;

  return (
    <form onSubmit={handleSubmit} className="transaction-form" style={{ position: 'relative' }}>
      {isProcessing && (
        <div className="ocr-loading-overlay">
          <div className="btn-spinner"></div>
          <p>{processingStatus}</p>
        </div>
      )}

      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
      
      <button 
        type="button" 
        className="btn-secondary" 
        onClick={handleScanClick}
        disabled={isLoading}
        style={{ marginBottom: '1rem', background: 'var(--color-bg-light)' }}
      >
        📸 Scan Struk dengan AI
      </button>

      {processingStatus && !isProcessing && !error && (
        <p className="success" style={{textAlign: 'center', margin: '-0.5rem 0 1rem 0', fontSize: '0.9rem'}}>
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
        <button type="button" className="btn-new-category" onClick={onOpenCategoryModal} title="Tambah Kategori Baru">Baru +</button>
      </div>

      <div className="form-group-inline">
          <div className="form-group" style={{flex: 1}}>
            <label>Tanggal</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="form-group" style={{flex: 2}}>
            <label>Deskripsi (Opsional)</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Makan siang, bensin, dll." />
          </div>
      </div>

      <button type="submit" disabled={isLoading}>{loading ? <div className="btn-spinner"></div> : 'Simpan Transaksi'}</button>
    </form>
  );
};

export default TransactionForm;