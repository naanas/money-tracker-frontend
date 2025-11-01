import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatNumberInput, parseNumberInput } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';

// [MODIFIKASI] Ambil 'accounts'
const SavingsGoals = ({ savingsGoals, accounts, onDataUpdate, isRefetching }) => {
  const { triggerSuccessAnimation } = useAuth();
  
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState(''); 
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [addFundLoading, setAddFundLoading] = useState(false);

  const handleCreateGoal = async (e) => {
    // ... (Fungsi ini tidak berubah) ...
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    const finalTargetAmount = parseNumberInput(targetAmount);
    if (isNaN(parseFloat(finalTargetAmount)) || parseFloat(finalTargetAmount) <= 0) {
        setFormError('Target jumlah harus angka positif.');
        setFormLoading(false);
        return;
    }
    if (targetDate) {
        const dateOnly = new Date(targetDate).toISOString().split('T')[0];
        const todayOnly = new Date().toISOString().split('T')[0];
        if (new Date(dateOnly) < new Date(todayOnly)) {
          setFormError('Tanggal target tidak boleh di masa lalu.');
          setFormLoading(false);
          return;
        }
    }
    try {
      await axiosClient.post('/api/savings', {
        name: name,
        target_amount: finalTargetAmount,
        target_date: targetDate || null
      });
      setName('');
      setTargetAmount('');
      setTargetDate(''); 
      triggerSuccessAnimation(); 
      await onDataUpdate(); 
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Gagal membuat target');
    }
    setFormLoading(false);
  };
  
  // === [MODIFIKASI BESAR] ===
  const handleAddFunds = async (goal) => {
    const amountString = prompt(`Berapa banyak dana yang ingin Anda tambahkan ke "${goal.name}"?\n(Ini akan membuat transaksi pengeluaran baru)`);
    if (!amountString) return; 

    const amount = parseNumberInput(amountString);
    if (isNaN(amount) || amount <= 0) {
      alert("Jumlah tidak valid.");
      return;
    }
    
    // [BARU] Minta pilih akun
    const accountNames = accounts.map((acc, i) => `(${i + 1}) ${acc.name}`).join('\n');
    const accountIndexStr = prompt(`Dari akun mana?\n${accountNames}`);
    const accountIndex = parseInt(accountIndexStr, 10) - 1;

    if (isNaN(accountIndex) || accountIndex < 0 || accountIndex >= accounts.length) {
        alert("Pilihan akun tidak valid.");
        return;
    }
    const account_id = accounts[accountIndex].id;

    setAddFundLoading(true); 
    try {
      await axiosClient.post('/api/savings/add', {
        goal_id: goal.id,
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        account_id: account_id // [BARU] Kirim account_id
      });
      triggerSuccessAnimation(); 
      await onDataUpdate(); 
    } catch (err) {
      alert(`Gagal menambah dana: ${err.response?.data?.error || err.message}`);
    }
    setAddFundLoading(false);
  };

  const handleDeleteGoal = async (goal) => {
    // ... (Fungsi ini tidak berubah) ...
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
      
      {/* Form untuk Bikin Target Baru (Tidak Berubah) */}
      <form onSubmit={handleCreateGoal} className="savings-form">
        {formError && <p className="error" style={{textAlign: 'center', margin: '0 0 1rem 0'}}>{formError}</p>}
        <div className="form-group-triple"> 
            <div className="form-group">
                <label>Nama Target</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dana Liburan" required />
            </div>
            <div className="form-group">
                <label>Target (Rp)</label>
                <input type="text" inputMode="numeric" value={formatNumberInput(targetAmount)} onChange={(e) => setTargetAmount(e.target.value)} placeholder="0" required className="input-currency" />
            </div>
            <div className="form-group">
                <label>Target Tanggal (Opsional)</label>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
        </div>
        <button type="submit" disabled={isLoading} style={{marginTop: '0.5rem'}}>
          {isLoading ? <div className="btn-spinner"></div> : 'Buat Target Baru'}
        </button>
      </form>

      <hr className="modal-divider" />

      {/* Daftar Target Tabungan (Tidak Berubah) */}
      <div className="savings-list">
        {savingsGoals.length > 0 ? (
          savingsGoals.map(goal => {
            const progress = (goal.current_amount / goal.target_amount) * 100;
            const remaining = goal.target_amount - goal.current_amount;
            const target = goal.target_date ? new Date(goal.target_date) : null;
            const today = new Date();
            const diffInDays = target ? Math.ceil((target - today.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)) : null;
            let daysRemainingText = '';
            if (target) {
                if (remaining <= 0) { daysRemainingText = 'Tercapai!'; }
                else if (diffInDays > 0) { daysRemainingText = `${diffInDays} hari lagi`; }
                else if (diffInDays === 0) { daysRemainingText = 'Hari Ini!'; }
                else { daysRemainingText = 'Terlewat'; }
            }

            return (
              <div className="savings-item" key={goal.id}>
                {/* ... (Isi item tabungan tidak berubah) ... */}
                <button className="pocket-delete-btn" onClick={() => handleDeleteGoal(goal)} title="Hapus Target Tabungan">✕</button>
                <div className="pocket-header">
                  <span className="pocket-title">{goal.name}</span>
                  <span className={`pocket-remaining ${remaining <= 0 ? 'income' : ''}`}>
                    {remaining <= 0 ? 'Tercapai!' : `${formatCurrency(remaining)} lagi`}
                  </span>
                </div>
                {goal.target_date && (
                    <div className="savings-date-info">
                        <span style={{fontSize: '0.85em', color: diffInDays <= 7 && diffInDays > 0 ? 'var(--color-accent-expense)' : 'var(--color-text-muted)'}}>
                           Target: {target.toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})} 
                           ({daysRemainingText})
                        </span>
                    </div>
                )}
                <div className="progress-bar-container small" style={{marginTop: goal.target_date ? '0.5rem' : '1rem'}}>
                  <div className={`progress-bar-fill ${progress >= 100 ? 'income' : ''}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                </div>
                <div className="pocket-footer">
                  <span className="income">{formatCurrency(goal.current_amount)}</span>
                  <span className="total"> / {formatCurrency(goal.target_amount)}</span>
                </div>
                <button className="btn-add-funds" onClick={() => handleAddFunds(goal)} disabled={isLoading}>
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