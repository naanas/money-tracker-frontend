import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';

const CategoryForm = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#ffffff'); // Default putih
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Panggil API backend yang baru
      await axiosClient.post('/api/categories', {
        name,
        type,
        icon,
        color,
      });
      
      setLoading(false);
      onSuccess(); // Refresh kategori di dashboard
      onClose();   // Tutup modal
      
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menambah kategori');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
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