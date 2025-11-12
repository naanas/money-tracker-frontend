import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatNumberInput, parseNumberInput } from '../utils/format';

const AddFundsModal = ({ isOpen, onClose, goal, accounts, onDataUpdate }) => {
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Set akun default saat modal dibuka
  useEffect(() => {
    if (isOpen && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
    if (!isOpen) {
      // Reset form saat ditutup
      setAmount('');
      setAccountId('');
      setError('');
    }
  }, [isOpen, accounts]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const parsedAmount = parseNumberInput(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Jumlah harus diisi');
      return;
    }
    if (!accountId) {
      setError('Akun sumber harus dipilih');
      return;
    }

    setLoading(true);
    try {
      await axiosClient.post('/api/savings/add', {
        goal_id: goal.id,
        amount: parseFloat(parsedAmount),
        date: new Date().toISOString().split('T')[0],
        account_id: accountId
      });
      onDataUpdate(); // Panggil refetch & animasi sukses
      onClose();      // Tutup modal
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menambah dana');
    }
    setLoading(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <h2>Tambah Dana ke Tabungan</h2>
        <p style={{ textAlign: 'center', marginTop: '-1rem', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
          🎯 <strong>{goal.name}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}
          
          <div className="form-group">
            <label>Jumlah</label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumberInput(amount)}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
              className="input-currency"
            />
          </div>
          
          <div className="form-group">
            <label>Dari Akun</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
              <option value="" disabled>Pilih Akun Sumber</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatCurrency(acc.current_balance)})
                </option>
              ))}
            </select>
            <small style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', display: 'block' }}>
              Ini akan membuat transaksi pengeluaran dari akun yang Anda pilih.
            </small>
          </div>

          <div className="modal-actions" style={{ flexDirection: 'column', gap: '0.75rem' }}>
            <button type="submit" disabled={loading}>
              {loading ? <div className="btn-spinner"></div> : 'Simpan ke Tabungan'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFundsModal;