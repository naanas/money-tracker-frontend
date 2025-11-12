import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { formatNumberInput, parseNumberInput, formatCurrency } from '../utils/format'; // [BARU] Impor formatCurrency
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// [BARU] Komponen Review AI
const AiReviewBox = ({ result, onApply, onCancel }) => {
  const { total, date, merchant } = result;
  return (
    <div className="ai-review-box">
      <h4>✅ Struk Terbaca!</h4>
      <p>Silakan periksa data di bawah sebelum diterapkan ke form.</p>
      <ul className="ai-review-list">
        <li>
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </li>
        <li>
          <span>Toko</span>
          <strong>{merchant || 'Tidak terdeteksi'}</strong>
        </li>
        <li>
          <span>Tanggal</span>
          <strong>{date ? new Date(date).toLocaleDateString('id-ID') : 'Tidak terdeteksi'}</strong>
        </li>
      </ul>
      <div className="ai-review-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Batal</button>
        <button type="button" onClick={onApply}>Terapkan</button>
      </div>
    </div>
  );
};


const TransactionForm = ({ categories, accounts, onTransactionAdded, onOpenCategoryModal, selectedDate, isRefetching }) => {
  const { user } = useAuth(); 
  
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState(''); 
  
  const getTodayDateString = () => new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(getTodayDateString());
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); 
  const [receiptUrl, setReceiptUrl] = useState(null); 
  const [isProcessing, setIsProcessing] = useState(false); 
  const [processingStatus, setProcessingStatus] = useState(''); 
  
  // [BARU] State untuk hasil AI
  const [aiResult, setAiResult] = useState(null);
  
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

  // [DIUBAH] Gunakan prop selectedDate untuk tanggal
  useEffect(() => {
    if (selectedDate) {
      const offset = selectedDate.getTimezoneOffset();
      const localDate = new Date(selectedDate.getTime() - (offset*60*1000));
      setDate(localDate.toISOString().split('T')[0]);
    }
  }, [selectedDate]);

  const handleScanClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setIsProcessing(true);
    setAiResult(null); // [BARU] Reset review box
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
      setReceiptUrl(publicUrl); // Simpan URL untuk submit

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
          // [DIUBAH] Tampilkan review box, jangan langsung isi form
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

  // [BARU] Handler untuk review AI
  const handleAiApply = () => {
    if (!aiResult) return;
    
    // 1. Isi Jumlah
    if (aiResult.total > 0) {
      setAmount(aiResult.total.toString());
    }
    // 2. Isi Tanggal
    if (aiResult.date) {
      setDate(aiResult.date);
    }
    // 3. Isi Deskripsi
    if (aiResult.merchant && aiResult.merchant !== "Merchant" && aiResult.merchant !== "Tidak diketahui") {
      const cleanMerchant = aiResult.merchant.replace(/[^a-zA-Z0-9\s.,&-]/g, '').trim();
      setDescription(`Belanja di ${cleanMerchant}`);
    } else {
      setDescription('Belanja harian');
    }
    setType('expense');
    setAiResult(null); // Sembunyikan review box
    setProcessingStatus('Data AI telah diterapkan ke form.');
  };
  
  const handleAiCancel = () => {
    setAiResult(null);
    setProcessingStatus('');
    setReceiptUrl(null); // Hapus juga struknya jika dibatalkan
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
      setAiResult(null); // [BARU]
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

      {/* [BARU] Tampilkan AI Review Box */}
      {aiResult && (
        <AiReviewBox
          result={aiResult}
          onApply={handleAiApply}
          onCancel={handleAiCancel}
        />
      )}

      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
      
      <button 
        type="button" 
        className="btn-secondary" 
        onClick={handleScanClick}
        disabled={isLoading || aiResult} // Disable jika sedang review
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