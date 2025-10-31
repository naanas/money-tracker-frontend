import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatNumberInput, parseNumberInput } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';

const SavingsGoals = ({ savingsGoals, onDataUpdate, isRefetching }) => {
  const { triggerSuccessAnimation } = useAuth();
  
  // State untuk form Bikin Target Baru
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  // [BARU] State untuk target date
  const [targetDate, setTargetDate] = useState(''); 
  
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  
  // State untuk Modal "Tambah Dana"
  const [addFundLoading, setAddFundLoading] = useState(false);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    const finalTargetAmount = parseNumberInput(targetAmount); // <-- Perbaikan: Ambil angka mentah dari input

    // Validasi target amount
    if (isNaN(parseFloat(finalTargetAmount)) || parseFloat(finalTargetAmount) <= 0) {
        setFormError('Target jumlah harus angka positif.');
        setFormLoading(false);
        return;
    }

    // [BARU] Validasi sederhana di client-side untuk target date
    if (targetDate && new Date(targetDate) < new Date(new Date().setHours(0,0,0,0))) {
      setFormError('Tanggal target tidak boleh di masa lalu.');
      setFormLoading(false);
      return;
    }

    try {
      await axiosClient.post('/api/savings', {
        name: name,
        target_amount: finalTargetAmount, // <-- Kirim angka mentah
        target_date: targetDate || null // <-- Kirim targetDate
      });
      setName('');
      setTargetAmount('');
      setTargetDate(''); // <-- Reset state
      triggerSuccessAnimation(); 
      await onDataUpdate(); 
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Gagal membuat target');
    }
    setFormLoading(false);
  };
  
  const handleAddFunds = async (goal) => {
    const amountString = prompt(`Berapa banyak dana yang ingin Anda tambahkan ke "${goal.name}"?\n(Ini akan membuat transaksi pengeluaran baru)`);
    if (!amountString) return; 

    const amount = parseNumberInput(amountString);
    if (isNaN(amount) || amount <= 0) {
      alert("Jumlah tidak valid.");
      return;
    }

    setAddFundLoading(true); 
    try {
      await axiosClient.post('/api/savings/add', {
        goal_id: goal.id,
        amount: amount,
        date: new Date().toISOString().split('T')[0] 
      });
      triggerSuccessAnimation(); 
      await onDataUpdate(); 
    } catch (err) {
      alert(`Gagal menambah dana: ${err.response?.data?.error || err.message}`);
    }
    setAddFundLoading(false);
  };

  const handleDeleteGoal = async (goal) => {
    if (!window.confirm(`Yakin ingin menghapus target tabungan "${goal.name}"?\n\n(Ini TIDAK akan menghapus transaksi yang sudah ada, tapi tabungan ini akan hilang.)`)) {
      return;
    }

    setAddFundLoading(true); 
    try {
      await axiosClient.delete(`/api/savings/${goal.id}`);
      triggerSuccessAnimation(); 
      await onDataUpdate(); 
    } catch (err) {
      alert(`Gagal menghapus: ${err.response?.data?.error || err.message}`);
    }
    setAddFundLoading(false);
  };

  const isLoading = formLoading || addFundLoading || isRefetching;

  return (
    <section className="card card-savings">
      <h3>🎯 Target Tabungan</h3>
      
      {/* Form untuk Bikin Target Baru */}
      <form onSubmit={handleCreateGoal} className="savings-form">
        {formError && <p className="error" style={{textAlign: 'center', margin: '0 0 1rem 0'}}>{formError}</p>}
        
        {/* === [MODIFIKASI: Gunakan grid 3 kolom] === */}
        <div className="form-group-triple"> 
            <div className="form-group">
                <label>Nama Target</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dana Liburan"
                  required
                />
            </div>
            <div className="form-group">
                <label>Target (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumberInput(targetAmount)}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="0"
                  required
                  className="input-currency"
                />
            </div>
            {/* [BARU] Input Tanggal Target */}
            <div className="form-group">
                <label>Target Tanggal (Opsional)</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
            </div>
        </div>
        {/* === [AKHIR MODIFIKASI] === */}
        
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
            
            // [BARU] Kalkulasi hari tersisa
            const target = goal.target_date ? new Date(goal.target_date) : null;
            const today = new Date();
            // setHours(0) agar perhitungannya hanya berdasarkan tanggal, bukan jam
            const daysRemaining = target ? Math.ceil((target - today.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)) : null;

            return (
              <div className="savings-item" key={goal.id}>
                <button 
                  className="pocket-delete-btn" 
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
                
                {/* [BARU] Tampilkan Tanggal Target */}
                {goal.target_date && (
                    <div className="savings-date-info">
                        <span style={{fontSize: '0.85em', color: daysRemaining <= 7 && daysRemaining > 0 ? 'var(--color-accent-expense)' : 'var(--color-text-muted)'}}>
                           Target: {target.toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})} 
                           ({daysRemaining > 0 ? `${daysRemaining} hari lagi` : (daysRemaining === 0 ? 'Hari Ini!' : 'Terlewat')})
                        </span>
                    </div>
                )}
                {/* [AKHIR BARU] */}
                
                <div className="progress-bar-container small" style={{marginTop: goal.target_date ? '0.5rem' : '1rem'}}>
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