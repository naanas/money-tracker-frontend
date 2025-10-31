import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';

// Ambil onClose (fungsi untuk menutup modal) & onSuccess (fungsi untuk refresh)
const CategoryForm = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#FFFFFF');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Panggil API backend yang baru kita buat
      // Sesuai skema DB, kita kirim icon dan color
      await axiosClient.post('/api/categories', {
        name,
        type,
        icon,
        color,
      });
      
      // Berhasil!
      setLoading(false);
      onSuccess(); // Panggil onSuccess untuk refresh daftar kategori di Dashboard
      onClose();   // Panggil onClose untuk menutup modal
      
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menambah kategori');
      setLoading(false);
    }
  };

  return (
    // 'modal-backdrop' adalah overlay gelap di belakang
    <div className="modal-backdrop" onClick={onClose}>
      {/* 'modal-content' adalah box putih di tengah */}
      {/* e.stopPropagation() mencegah modal tertutup saat box-nya diklik */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Buat Kategori Baru</h2>
        <form onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}
          
          <div className="form-group">
            <label>Nama Kategori</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Bensin"
              required
            />
          </div>

          <div className="form-group-radio">
            <label>
              <input 
                type="radio" 
                value="expense" 
                checked={type === 'expense'} 
                onChange={() => setType('expense')}
              />
              Pengeluaran
            </label>
            <label>
              <input 
                type="radio" 
                value="income" 
                checked={type === 'income'} 
                onChange={() => setType('income')}
              />
              Pemasukan
            </label>
          </div>

          <div className="form-group">
            <label>Icon (Opsional)</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Contoh: 🚗 (emoji)"
            />
          </div>

          <div className="form-group">
            <label>Warna (Opsional)</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="color-picker"
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Batal
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Kategori'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryForm;