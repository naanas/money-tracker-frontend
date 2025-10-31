import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';

const CategoryForm = ({ existingCategories = [], onClose, onSuccess }) => {
  const { user } = useAuth();
  
  // State untuk form
  const [mode, setMode] = useState('create'); // 'create' or 'edit'
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#ffffff');
  
  // State untuk UI
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter hanya kategori buatan user
  const customCategories = existingCategories.filter(c => c.user_id === user.id);

  // Fungsi untuk membersihkan form
  const clearForm = () => {
    setMode('create');
    setSelectedCategoryId(null);
    setName('');
    setType('expense');
    setIcon('');
    setColor('#ffffff');
    setError('');
  };
  
  // Fungsi untuk mengisi form saat item diklik (mode edit)
  const handleEditClick = (category) => {
    setMode('edit');
    setSelectedCategoryId(category.id);
    setName(category.name);
    setType(category.type);
    setIcon(category.icon || '');
    setColor(category.color || '#ffffff');
    setError('');
  };

  // Fungsi submit (bisa create atau update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = { name, type, icon, color };

    try {
      if (mode === 'create') {
        // Panggil API POST
        await axiosClient.post('/api/categories', payload);
      } else {
        // Panggil API PUT
        await axiosClient.put(`/api/categories/${selectedCategoryId}`, payload);
      }
      
      clearForm();
      setLoading(false);
      onSuccess(); // Refresh daftar kategori di dashboard
      
    } catch (err) {
      setError(err.response?.data?.error || `Gagal ${mode === 'create' ? 'menambah' : 'mengubah'} kategori`);
      setLoading(false);
    }
  };

  // Fungsi delete
  const handleDelete = async (categoryId) => {
    if (!window.confirm('Yakin ingin menghapus kategori ini? Transaksi yang sudah ada tidak akan terhapus.')) {
      return;
    }

    setError('');
    try {
      await axiosClient.delete(`/api/categories/${categoryId}`);
      onSuccess(); // Refresh data
      // Jika yang dihapus adalah yang sedang diedit, bersihkan form
      if (categoryId === selectedCategoryId) {
        clearForm();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menghapus kategori');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* --- FORM CREATE / EDIT --- */}
        <h2>{mode === 'create' ? 'Buat Kategori Baru' : 'Edit Kategori'}</h2>
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
          
          <div className="form-group-inline" style={{ marginTop: '1rem' }}>
            <button type="submit" disabled={loading} style={{width: '100%'}}>
              {loading ? 'Menyimpan...' : (mode === 'create' ? 'Tambah Kategori' : 'Simpan Perubahan')}
            </button>
            {/* Tampilkan tombol Batal jika sedang mode edit */}
            {mode === 'edit' && (
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={clearForm}
                disabled={loading}
              >
                Batal
              </button>
            )}
          </div>
        </form>

        {/* --- DAFTAR KATEGORI CUSTOM --- */}
        <hr className="modal-divider" />
        <h3>Kategori Custom Anda</h3>
        <div className="category-list-modal">
          {customCategories.length > 0 ? (
            customCategories.map(cat => (
              <div key={cat.id} className="category-list-item">
                <div className="category-details" onClick={() => handleEditClick(cat)} title="Klik untuk edit">
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

        <div className="modal-actions" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryForm;