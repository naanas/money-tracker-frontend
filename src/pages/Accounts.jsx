import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext'; // [BARU]
import { formatCurrency, formatNumberInput, parseNumberInput } from '../utils/format';
import EmptyState from '../components/EmptyState'; // [BARU]

// ... (Komponen AccountForm tidak berubah, biarkan apa adanya)
const AccountForm = ({ onAccountAdded, accountToEdit, setAccountToEdit }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('Bank');
  const [initialBalance, setInitialBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!accountToEdit;

  useEffect(() => {
    if (accountToEdit) {
      setName(accountToEdit.name);
      setType(accountToEdit.type);
      setInitialBalance(accountToEdit.initial_balance.toString());
    } else {
      setName('');
      setType('Bank');
      setInitialBalance('');
    }
  }, [accountToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      name,
      type,
      initial_balance: parseFloat(parseNumberInput(initialBalance)) || 0
    };

    try {
      if (isEditing) {
        await axiosClient.put(`/api/accounts/${accountToEdit.id}`, payload);
      } else {
        await axiosClient.post('/api/accounts', payload);
      }
      onAccountAdded(); // Refresh daftar
      setAccountToEdit(null); // Reset form
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan akun');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="account-form card">
      <h3>{isEditing ? 'Edit Akun' : 'Tambah Akun Baru'}</h3>
      {error && <p className="error">{error}</p>}
      <div className="form-group">
        <label>Nama Akun</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contoh: BCA, GoPay, Dompet"
          required
        />
      </div>
      <div className="form-group-inline">
        <div className="form-group" style={{ flex: 1 }}>
          <label>Tipe Akun</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="Bank">Bank</option>
            <option value="E-Wallet">E-Wallet</option>
            <option value="Tunai">Tunai</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Saldo Awal</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatNumberInput(initialBalance)}
            onChange={(e) => setInitialBalance(e.target.value)}
            placeholder="0"
            className="input-currency"
          />
        </div>
      </div>
      <div className="form-group-inline" style={{ marginTop: '1rem' }}>
        <button type="submit" disabled={loading}>
          {loading ? <div className="btn-spinner"></div> : (isEditing ? 'Simpan' : 'Tambah')}
        </button>
        {isEditing && (
          <button type="button" className="btn-secondary" onClick={() => setAccountToEdit(null)} disabled={loading}>
            Batal
          </button>
        )}
      </div>
    </form>
  );
};


// Halaman Utama Akun
const Accounts = () => {
  const { triggerSuccessAnimation } = useAuth();
  
  // [BARU] Ambil data dari context
  const { accounts, refetchAccounts, loading, error } = useData();
  
  const [accountToEdit, setAccountToEdit] = useState(null);
  const [swipedAccountId, setSwipedAccountId] = useState(null);
  const touchStartRef = useRef(null);
  const minSwipeDistance = 50; 

  // [DIHAPUS] fetchAccounts() lokal dihapus, diganti context

  const handleSuccess = () => {
    refetchAccounts(); // [DIUBAH] Panggil refetch dari context
    triggerSuccessAnimation();
    setSwipedAccountId(null); 
  };

  const handleDelete = async (account) => {
    if (!window.confirm(`Yakin ingin menghapus akun "${account.name}"?\n\nAnda hanya bisa menghapus akun yang tidak memiliki transaksi.`)) {
      return;
    }
    try {
      await axiosClient.delete(`/api/accounts/${account.id}`);
      handleSuccess();
    } catch (err) {
      alert(`Gagal hapus: ${err.response?.data?.error || 'Gagal menghapus akun'}`);
    }
  };

  // ... (Semua handler swipe tidak berubah)
  const handleTouchStart = (e, accountId) => {
    if (!swipedAccountId || swipedAccountId === accountId) {
      touchStartRef.current = e.targetTouches[0].clientX;
    }
  };
  const handleTouchEnd = (e, accountId) => {
    if (touchStartRef.current === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const deltaX = touchEnd - touchStartRef.current;
    if (deltaX < -minSwipeDistance) setSwipedAccountId(accountId);
    else if (deltaX > minSwipeDistance) setSwipedAccountId(null);
    touchStartRef.current = null;
  };
  const handleCardClick = (accountId) => {
    if (swipedAccountId === accountId) setSwipedAccountId(null);
  };
  const handleEditClick = (account) => {
    setAccountToEdit(account);
    setSwipedAccountId(null);
  };
  const handleDeleteClick = (account) => {
    handleDelete(account);
    setSwipedAccountId(null);
  };

  return (
    <div className="accounts-page">
      <h2>Kelola Akun</h2>
      <p>Atur semua sumber dana Anda di sini, seperti rekening bank, dompet digital, atau uang tunai.</p>
      
      <AccountForm
        onAccountAdded={handleSuccess}
        accountToEdit={accountToEdit}
        setAccountToEdit={setAccountToEdit}
      />

      <div className="account-list card">
        <h3>Daftar Akun Anda</h3>
        {loading && <p>Memuat...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && accounts.length === 0 && (
          // [BARU] Empty state
          <EmptyState
            title="Belum Ada Akun"
            message="Anda belum memiliki akun. Silakan tambahkan satu di atas untuk memulai."
          />
        )}
        
        <div className="pocket-grid">
          {accounts.map(acc => (
            <div className="pocket-item-swipe-wrapper" key={acc.id}>
              {/* Tombol yang tersembunyi */}
              <div className="pocket-item-actions">
                <button 
                  className="pocket-action-btn btn-edit" 
                  onClick={() => handleEditClick(acc)}
                >
                  Edit
                </button>
                <button 
                  className="pocket-action-btn btn-delete" 
                  onClick={() => handleDeleteClick(acc)}
                >
                  Hapus
                </button>
              </div>

              {/* Konten yang terlihat & bisa digeser */}
              <div 
                className={`pocket-item-content ${swipedAccountId === acc.id ? 'swiped-open' : ''}`}
                onTouchStart={(e) => handleTouchStart(e, acc.id)}
                onTouchEnd={(e) => handleTouchEnd(e, acc.id)}
                onClick={() => handleCardClick(acc.id)}
              >
                <div className="pocket-header">
                  <span className="pocket-title">{acc.name}</span>
                  <span className="pocket-remaining" style={{fontSize: '0.8em'}}>{acc.type}</span>
                </div>
                <h2 className={acc.current_balance >= 0 ? 'income' : 'expense'} style={{margin: '0.5rem 0', textAlign: 'right'}}>
                  {formatCurrency(acc.current_balance)}
                </h2>
                <span style={{fontSize: '0.8em', color: 'var(--color-text-muted)', textAlign: 'right'}}>
                  Saldo Awal: {formatCurrency(acc.initial_balance)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Accounts;