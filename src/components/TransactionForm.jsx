import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { formatNumberInput, parseNumberInput, formatCurrency } from '../utils/format';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// Komponen Review AI (Tetap sama)
const AiReviewBox = ({ result, onApply, onCancel }) => {
  const { total, date, merchant } = result;
  return (
    <div className="ai-review-box">
      <h4>✅ Struk Terbaca!</h4>
      <p>Silakan periksa data di bawah sebelum diterapkan ke form.</p>
      <ul className="ai-review-list">
        <li><span>Total</span><strong>{formatCurrency(total)}</strong></li>
        <li><span>Toko</span><strong>{merchant || 'Tidak terdeteksi'}</strong></li>
        <li><span>Tanggal</span><strong>{date ? new Date(date).toLocaleDateString('id-ID') : 'Tidak terdeteksi'}</strong></li>
      </ul>
      <div className="ai-review-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Batal</button>
        <button type="button" onClick={onApply}>Terapkan</button>
      </div>
    </div>
  );
};

// [MODIFIKASI] Menambahkan prop initialData
const TransactionForm = ({ categories, accounts, onTransactionAdded, onOpenCategoryModal, selectedDate, isRefetching, initialData = null }) => {
  const { user } = useAuth(); 
  
  // State form
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState(''); 
  const getTodayDateString = () => new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(getTodayDateString());
  
  // State UI
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); 
  const [receiptUrl, setReceiptUrl] = useState(null); 
  const [isProcessing, setIsProcessing] = useState(false); 
  const [processingStatus, setProcessingStatus] = useState(''); 
  const [aiResult, setAiResult] = useState(null);
  
  const fileInputRef = useRef(null); 
  const currentCategories = categories.filter(c => c.type === type && c.name !== 'Transfer');

  // [BARU] Efek untuk mengisi form jika ada initialData (Mode Edit)
  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount.toString());
      setType(initialData.type);
      setCategory(initialData.category);
      setDescription(initialData.description || '');
      setAccountId(initialData.account_id);
      
      // Format tanggal dari ISO string ke YYYY-MM-DD
      if (initialData.date) {
        const d = new Date(initialData.date);
        setDate(d.toISOString().split('T')[0]);
      }
      
      if (initialData.receipt_url) {
        setReceiptUrl(initialData.receipt_url);
      }
    } else {
      // Jika mode tambah baru & belum pilih akun, pilih akun pertama
      if (!accountId && accounts.length > 0) {
        setAccountId(accounts[0].id);
      }
      // Set tanggal default
      if (selectedDate) {
        const offset = selectedDate.getTimezoneOffset();
        const localDate = new Date(selectedDate.getTime() - (offset*60*1000));
        setDate(localDate.toISOString().split('T')[0]);
      }
    }
  }, [initialData, accounts, selectedDate]); // Hapus dependency accountId agar tidak override saat edit

  useEffect(() => {
    // Reset kategori jika tipe berubah, KECUALI saat pertama kali load edit data
    if (!initialData || (initialData && initialData.type !== type)) {
      setCategory('');
    }
  }, [type]);

  const handleScanClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    // ... (Logika Scan AI tetap sama seperti sebelumnya) ...
    const file = e.target.files[0];
    if (!file || !user) return;

    setIsProcessing(true);
    setAiResult(null); 
    setError('');
    setProcessingStatus('Memulai proses...');

    try {
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

      setProcessingStatus('🤖 AI sedang membaca struk...');
      const API_URL = import.meta.env.VITE_PYTHON_API_URL; 
      
      // Fallback dummy jika API tidak ada (agar tidak error saat testing UI)
      if (!API_URL) {
          console.warn("API URL Python tidak ditemukan, menggunakan mock.");
          // throw new Error("URL API Python belum disetting di .env");
      }

      let result;
      if (API_URL) {
          const response = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: publicUrl })
          });
          if (!response.ok) throw new Error(`Gagal menghubungi API AI: ${response.statusText}`);
          result = await response.json();
      } else {
          // Mock result
          result = { success: true, data: { total: 50000, date: new Date().toISOString(), merchant: "Mock Store" }};
      }

      if (result.success && result.data) {
          setAiResult(result.data);
          setProcessingStatus('✅ Struk terbaca! Silakan review.');
      } else {
          throw new Error(result.error || 'AI tidak dapat memproses struk.');
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

  const handleAiApply = () => {
    if (!aiResult) return;
    if (aiResult.total > 0) setAmount(aiResult.total.toString());
    if (aiResult.date) setDate(aiResult.date);
    if (aiResult.merchant && aiResult.merchant !== "Merchant" && aiResult.merchant !== "Tidak diketahui") {
      const cleanMerchant = aiResult.merchant.replace(/[^a-zA-Z0-9\s.,&-]/g, '').trim();
      setDescription(`Belanja di ${cleanMerchant}`);
    } else {
      setDescription('Belanja harian');
    }
    setType('expense');
    setAiResult(null); 
    setProcessingStatus('Data AI telah diterapkan ke form.');
  };
  
  const handleAiCancel = () => {
    setAiResult(null);
    setProcessingStatus('');
    setReceiptUrl(null); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category && currentCategories.length > 0) { setError('Pilih kategori'); return; }
    if (!accountId) { setError('Pilih akun'); return; }

    setLoading(true);
    setError('');
    
    const payload = {
      amount: parseFloat(amount),
      category: category || (type === 'expense' ? 'Other Expenses' : 'Other Income'),
      type,
      description,
      date,
      account_id: accountId,
      receipt_url: receiptUrl,
    };

    try {
      if (initialData) {
        // [BARU] Mode Edit: Gunakan PUT
        await axiosClient.put(`/api/transactions/${initialData.id}`, payload);
      } else {
        // Mode Create: Gunakan POST
        await axiosClient.post('/api/transactions', payload);
      }
      
      // Reset form hanya jika bukan edit (atau tutup modal via parent)
      if (!initialData) {
        setAmount('');
        setCategory('');
        setDescription('');
        setReceiptUrl(null);
        setProcessingStatus('');
        setAiResult(null);
        setDate(getTodayDateString()); 
      }
      
      onTransactionAdded(); // Callback sukses
      
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan transaksi');
    } finally {
      setLoading(false);
    }
  };
  
  const isLoading = loading || isRefetching || isProcessing;
  const isEditMode = !!initialData;

  return (
    <form onSubmit={handleSubmit} className="transaction-form" style={{ position: 'relative' }}>
      {isProcessing && (
        <div className="ocr-loading-overlay">
          <div className="btn-spinner"></div>
          <p>{processingStatus}</p>
        </div>
      )}

      {aiResult && (
        <AiReviewBox result={aiResult} onApply={handleAiApply} onCancel={handleAiCancel} />
      )}

      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
      
      <button 
        type="button" 
        className="btn-secondary" 
        onClick={handleScanClick}
        disabled={isLoading || aiResult} 
        style={{ marginBottom: '1rem', background: 'var(--color-bg-light)' }}
      >
        📸 {receiptUrl ? 'Ganti Foto Struk' : 'Scan Struk dengan AI'}
      </button>

      {/* Tampilkan preview struk kecil jika ada URL */}
      {receiptUrl && !aiResult && (
        <div style={{ marginBottom: '10px', fontSize: '0.8rem', color: 'green' }}>
            ✓ Foto struk terlampir
        </div>
      )}

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

      <button type="submit" disabled={isLoading}>
          {loading ? <div className="btn-spinner"></div> : (isEditMode ? 'Simpan Perubahan' : 'Simpan Transaksi')}
      </button>
    </form>
  );
};

export default TransactionForm;