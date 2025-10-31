import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';

const CategoryForm = ({ existingCategories = [], onClose, onSuccess }) => {
  const { user } = useAuth(); // Ambil user untuk filter
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter untuk menampilkan HANYA kategori milik user
  const customCategories = existingCategories.filter(c => c.user_id === user.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axiosClient.post('/api/categories', {
        name,
        type,
        icon,
        color,
      });
      
      setName('');
      setIcon('');
      setColor('#ffffff');
      setLoading(false);
      onSuccess(); // Refresh daftar kategori di dashboard
      // Biarkan modal tetap terbuka untuk menambah lagi
      
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menambah kategori');
      setLoading(false);
    }
  };

  // === [FUNGSI BARU UNTUK HAPUS] ===
  const handleDelete = async (categoryId) => {
    if (!window.confirm('Yakin ingin menghapus kategori ini? Transaksi yang sudah ada tidak akan terhapus.')) {
      return;
    }

    setError('');
    try {
      // Panggil API backend DELETE yang baru
      await axiosClient.delete(`/api/categories/${categoryId}`);
      onSuccess(); // Refresh data
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menghapus kategori');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* --- FORM TAMBAH KATEGORI --- */}
        <h2>Kelola Kategori</h2>
        <form onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}
          
          <div className="form-group">
            <label>Nama Kategori Baru</label>
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

          <div className="form-group-inline">
            <div className="form-group" style={{flex: 1}}>
              <label>Icon (Opsional)</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🚗"
              />
            </div>
            <div className="form-group" style={{flex: 1}}>
              <label>Warna (Opsional)</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="color-picker"
              />
            </div>
          </div>
          
          <button type="submit" disabled={loading} style={{width: '100%'}}>
            {loading ? 'Menyimpan...' : 'Tambah Kategori'}
          </button>
        </form>

        {/* --- [BARU] DAFTAR KATEGORI CUSTOM --- */}
        <hr className="modal-divider" />
        <h3>Kategori Custom Anda</h3>
        <div className="category-list-modal">
          {customCategories.length > 0 ? (
            customCategories.map(cat => (
              <div key={cat.id} className="category-list-item">
                <div>
                  <span className="category-icon" style={{backgroundColor: cat.color}}>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span className={`category-type ${cat.type}`}>({cat.type})</span>
                </div>
                <button 
                  className="btn-delete-category" 
                  onClick={() => handleDelete(cat.id)}
                  title="Hapus Kategori"
                >
                  ✕
                </button>
              </div>
            ))
          ) : (
            <p style={{textAlign: 'center', color: 'var(--color-text-muted)'}}>
              Belum ada kategori custom.
            </p>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryForm;