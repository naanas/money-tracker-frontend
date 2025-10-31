import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatNumberInput, parseNumberInput } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';

const SavingsGoals = ({ savingsGoals, onDataUpdate, isRefetching }) => {
  const { triggerSuccessAnimation } = useAuth();
  
  // State untuk form Bikin Target Baru
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  
  // State untuk Modal "Tambah Dana"
  const [addFundLoading, setAddFundLoading] = useState(false);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      await axiosClient.post('/api/savings', {
        name: name,
        target_amount: parseNumberInput(targetAmount)
      });
      setName('');
      setTargetAmount('');
      triggerSuccessAnimation(); // Tampilkan checkmark
      await onDataUpdate(); // Refresh semua data di dashboard
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Gagal membuat target');
    }
    setFormLoading(false);
  };

  const handleAddFunds = async (goal) => {
    const amountString = prompt(`Berapa banyak dana yang ingin Anda tambahkan ke "${goal.name}"?\n(Ini akan membuat transaksi pengeluaran baru)`);
    if (!amountString) return; // Dibatalkan

    const amount = parseNumberInput(amountString);
    if (isNaN(amount) || amount <= 0) {
      alert("Jumlah tidak valid.");
      return;
    }

    setAddFundLoading(true); // Tampilkan loading global
    try {
      await axiosClient.post('/api/savings/add', {
        goal_id: goal.id,
        amount: amount,
        date: new Date().toISOString().split('T')[0] // Tanggal hari ini
      });
      triggerSuccessAnimation(); // Tampilkan checkmark
      await onDataUpdate(); // Refresh semua data di dashboard
    } catch (err) {
      alert(`Gagal menambah dana: ${err.response?.data?.error || err.message}`);
    }
    setAddFundLoading(false);
  };

  const handleDeleteGoal = async (goal) => {
    if (!window.confirm(`Yakin ingin menghapus target tabungan "${goal.name}"?\n\n(Ini TIDAK akan menghapus transaksi yang sudah ada, tapi tabungan ini akan hilang.)`)) {
      return;
    }

    setAddFundLoading(true); // Gunakan loading global
    try {
      await axiosClient.delete(`/api/savings/${goal.id}`);
      triggerSuccessAnimation(); // Tampilkan checkmark
      await onDataUpdate(); // Refresh semua data di dashboard
    } catch (err) {
      alert(`Gagal menghapus: ${err.response?.data?.error || err.message}`);
    }
    setAddFundLoading(false);
  };

  // Gabungkan semua state loading
  const isLoading = formLoading || addFundLoading || isRefetching;

  return (
    <section className="card card-savings">
      <h3>🎯 Target Tabungan</h3>
      
      {/* Form untuk Bikin Target Baru */}
      <form onSubmit={handleCreateGoal} className="savings-form">
        {formError && <p className="error" style={{textAlign: 'center', margin: '0 0 1rem 0'}}>{formError}</p>}
        <div className="form-group-inline">
          <div className="form-group">
            <label>Nama Target</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dana Liburan, Laptop, dll."
              required
            />
          </div>
          <div className="form-group">
            <label>Target (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumberInput(targetAmount)}
              onChange={(e) => setTargetAmount(parseNumberInput(e.target.value))}
              placeholder="0"
              required
              className="input-currency"
            />
          </div>
        </div>
        <button type="submit" disabled={isLoading} style={{marginTop: '0.5rem'}}>
          {isLoading ? <div className="btn-spinner"></div> : 'Buat Target Baru'}
        </button>
      </form>

      <hr className="modal-divider" />

      {/* Daftar Target Tabungan */}
      <div className="savings-list">
        {savingsGoals.length > 0 ? (
          savingsGoals.map(goal => {
            const progress = (goal.current_amount / goal.target_amount) * 100;
            const remaining = goal.target_amount - goal.current_amount;

            return (
              <div className="savings-item" key={goal.id}>
                <button 
                  className="pocket-delete-btn" // Pakai style yang sama
                  onClick={() => handleDeleteGoal(goal)}
                  title="Hapus Target Tabungan"
                >
                  ✕
                </button>
                <div className="pocket-header">
                  <span className="pocket-title">{goal.name}</span>
                  <span className={`pocket-remaining ${remaining <= 0 ? 'income' : ''}`}>
                    {remaining <= 0 ? 'Tercapai!' : `${formatCurrency(remaining)} lagi`}
                  </span>
                </div>
                <div className="progress-bar-container small">
                  <div 
                    className={`progress-bar-fill ${progress >= 100 ? 'income' : ''}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>
                <div className="pocket-footer">
                  <span className="income">{formatCurrency(goal.current_amount)}</span>
                  <span className="total"> / {formatCurrency(goal.target_amount)}</span>
                </div>
                <button 
                  className="btn-add-funds" 
                  onClick={() => handleAddFunds(goal)}
                  disabled={isLoading}
                >
                  {isLoading ? '...' : 'Tambah Dana'}
                </button>
              </div>
            );
          })
        ) : (
          <p style={{textAlign: 'center', color: 'var(--color-text-muted)', padding: '1rem 0'}}>
            Belum ada target tabungan.
          </p>
        )}
      </div>
    </section>
  );
};

export default SavingsGoals;