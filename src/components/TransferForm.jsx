import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { formatNumberInput, parseNumberInput } from '../utils/format';

const TransferForm = ({ accounts, onTransferAdded, isRefetching, selectedDate }) => {
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const getInitialDate = () => {
    const today = new Date();
    const targetDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), today.getDate());
    return targetDate.toISOString().split('T')[0];
  };
  const [date, setDate] = useState(getInitialDate());

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDate(getInitialDate());
  }, [selectedDate]);

  // Set akun default
  useEffect(() => {
    if (!fromAccountId && accounts.length > 0) {
      setFromAccountId(accounts[0].id);
    }
    if (!toAccountId && accounts.length > 1) {
      setToAccountId(accounts[1].id);
    }
  }, [accounts, fromAccountId, toAccountId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fromAccountId || !toAccountId) {
      setError('Pilih akun asal dan tujuan.');
      return;
    }
    if (fromAccountId === toAccountId) {
      setError('Akun asal dan tujuan tidak boleh sama.');
      return;
    }

    setLoading(true);
    try {
      await axiosClient.post('/api/transactions/transfer', {
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount: parseFloat(amount),
        date,
        description: description || 'Transfer'
      });
      
      setAmount('');
      setDescription('');
      onTransferAdded();

    } catch (err) {
      setError(err.response?.data?.error || 'Gagal melakukan transfer');
    }
    setLoading(false);
  };

  const isLoading = loading || isRefetching;

  return (
    <form onSubmit={handleSubmit} className="transaction-form">
      {error && <p className="error">{error}</p>}
      
      <div className="form-group-inline">
        <div className="form-group" style={{ flex: 1 }}>
          <label>Dari Akun</label>
          <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} required>
            <option value="" disabled>Pilih Akun</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Ke Akun</label>
          <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} required>
            <option value="" disabled>Pilih Akun</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
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

      <div className="form-group-inline">
          <div className="form-group" style={{flex: 1}}>
            <label>Tanggal</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="form-group" style={{flex: 2}}>
            <label>Deskripsi (Opsional)</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Pindah dana" />
          </div>
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? <div className="btn-spinner"></div> : 'Transfer'}
      </button>
    </form>
  );
};

export default TransferForm;