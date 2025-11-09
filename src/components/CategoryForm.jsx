import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';

// Pilihan cepat untuk Icon dan Warna
const ICON_PRESETS = ['🍔', '🚗', '🛍️', '🎬', '🏠', '🏥', '🎓', '✈️', '💰', '💵', '🎁', '📱', '💅', '⚽', '🎮', '🛒'];
const COLOR_PRESETS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#1c1917'];

const CategoryForm = ({ existingCategories = [], onClose, onSuccess }) => {
  const { user } = useAuth();
  
  // State Form
  const [mode, setMode] = useState('create'); // 'create' atau 'edit'
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [icon, setIcon] = useState('🏷️'); 
  const [color, setColor] = useState(COLOR_PRESETS[0]); 
  
  // State UI
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter kategori buatan user (pastikan user.id ada)
  const customCategories = existingCategories.filter(c => user?.id && c.user_id === user.id);

  // Reset form ke tampilan awal
  const clearForm = () => {
    setMode('create');
    setSelectedCategoryId(null);
    setName('');
    setType('expense');
    setIcon('🏷️');
    setColor(COLOR_PRESETS[0]);
    setError('');
  };
  
  // Isi form saat tombol edit diklik
  const handleEditClick = (category) => {
    setMode('edit');
    setSelectedCategoryId(category.id);
    setName(category.name);
    setType(category.type);
    setIcon(category.icon || '🏷️');
    setColor(category.color || '#ffffff');
    setError('');
    // Scroll ke atas agar user lihat formnya
    document.querySelector('.modal-content')?.scrollTo(0, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
        setError("Nama kategori wajib diisi.");
        return;
    }
    setLoading(true);
    setError('');

    try {
      const payload = { name, type, icon, color };
      if (mode === 'create') {
        await axiosClient.post('/api/categories', payload);
      } else {
        await axiosClient.put(`/api/categories/${selectedCategoryId}`, payload);
      }
      
      // PENTING: Panggil onSuccess agar Dashboard me-refresh data
      if (onSuccess) await onSuccess();
      
      clearForm();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Gagal menyimpan kategori. Coba nama lain.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Hapus kategori ini? Transaksi yang menggunakannya mungkin jadi berantakan.')) {
      return;
    }
    try {
      await axiosClient.delete(`/api/categories/${categoryId}`);
      if (categoryId === selectedCategoryId) clearForm();
      // Refresh data setelah hapus
      if (onSuccess) await onSuccess();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus (mungkin sedang dipakai transaksi).');
    }
  };

  return (
    // Backdrop: pastikan dia flex center
    <div className="modal-backdrop" onClick={onClose} style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', 
        alignItems: 'center', justifyContent: 'center', zIndex: 1100,
        padding: '1rem'
    }}>
      {/* Modal Content: Kunci agar bisa scroll adalah max-height dan overflow-y: auto */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
          width: '100%', maxWidth: '500px', 
          maxHeight: '90vh', overflowY: 'auto', // INI KUNCINYA AGAR BISA SCROLL
          backgroundColor: 'var(--color-bg-medium)', 
          borderRadius: 'var(--radius-large)', padding: '1.5rem',
          border: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column'
      }}>
        
        {/* Header Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
                {mode === 'create' ? '✨ Tambah Kategori' : '✏️ Edit Kategori'}
            </h2>
            <button onClick={onClose} type="button" style={{ 
                background: 'transparent', border: 'none', fontSize: '1.5rem', 
                color: 'var(--color-text-muted)', cursor: 'pointer', width: 'auto', padding: '0.5rem' 
            }}>✕</button>
        </div>

        {/* Preview Card (Biar user tau jadinya kayak apa) */}
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', 
          backgroundColor: 'var(--color-bg-light)', borderRadius: 'var(--radius-medium)',
          marginBottom: '1.5rem', border: `2px solid ${color}`
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%', backgroundColor: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem',
            color: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', flexShrink: 0
          }}>
            {icon}
          </div>
          <div style={{flex: 1, overflow: 'hidden'}}>
            <div style={{ fontWeight: '600', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {name || 'Nama Kategori'}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
               {type === 'expense' ? 'Pengeluaran 💸' : 'Pemasukan 💰'}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <p className="error" style={{marginBottom: '1rem'}}>{error}</p>}
          
          {/* Pilihan Tipe */}
          <div className="form-group-radio" style={{marginBottom: '1.5rem'}}>
             <label style={{justifyContent: 'center', padding: '0.5rem'}}>
               <input type="radio" value="expense" checked={type === 'expense'} onChange={() => setType('expense')}/> 
               Pengeluaran
             </label>
             <label style={{justifyContent: 'center', padding: '0.5rem'}}>
               <input type="radio" value="income" checked={type === 'income'} onChange={() => setType('income')}/> 
               Pemasukan
             </label>
          </div>

          {/* Input Nama */}
          <div className="form-group">
            <label>Nama Kategori</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Skincare, Kopi, Parkir..."
              required
              maxLength={30}
            />
          </div>

          {/* Pilihan Icon Preset */}
          <div className="form-group">
            <label>Pilih Ikon</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {ICON_PRESETS.map((p) => (
                <button
                  key={p} type="button" onClick={() => setIcon(p)}
                  style={{
                    width: '40px', height: '40px', padding: 0, fontSize: '1.4rem',
                    background: icon === p ? 'var(--color-bg-light)' : 'transparent',
                    border: icon === p ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            {/* Input Icon Custom Emoji */}
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Ketik emoji lain di sini..."
              style={{ textAlign: 'center', fontSize: '1.2rem' }}
              maxLength={5}
            />
          </div>

          {/* Pilihan Warna Preset */}
          <div className="form-group">
            <label>Pilih Warna</label>
             <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c} type="button" onClick={() => setColor(c)}
                  style={{
                    width: '32px', height: '32px', padding: 0, backgroundColor: c,
                    border: color === c ? '3px solid var(--color-text)' : 'none',
                    borderRadius: '50%', cursor: 'pointer', transition: 'transform 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
              ))}
            </div>
            {/* Input Warna Custom */}
            <div style={{display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--color-bg-light)', padding: '5px 10px', borderRadius: 'var(--radius-medium)', border: '1px solid var(--color-border)'}}>
                <input 
                    type="color" 
                    value={color} 
                    onChange={(e) => setColor(e.target.value)} 
                    style={{flexShrink: 0, width: '40px', height: '30px', padding: 0, border: 'none', background: 'none', cursor: 'pointer'}} 
                />
                <span style={{fontFamily: 'monospace', fontSize: '0.9rem', opacity: 0.7}}>{color}</span>
            </div>
          </div>
          
          {/* Tombol Aksi Form */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            {mode === 'edit' && (
               <button type="button" className="btn-secondary" onClick={clearForm} disabled={loading}>
                 Batal
               </button>
            )}
            <button type="submit" disabled={loading} style={{flex: 1}}>
              {loading ? <div className="btn-spinner"></div> : (mode === 'create' ? 'Simpan Kategori' : 'Update Kategori')}
            </button>
          </div>
        </form>

        <hr className="modal-divider" style={{margin: '2rem 0'}} />

        {/* Daftar Kategori Custom */}
        <h3 style={{marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem'}}>Kategori Buatan Anda</h3>
        
        {customCategories.length > 0 ? (
          <div className="category-list-modal" style={{ 
              maxHeight: '250px', overflowY: 'auto', // Scroll terpisah untuk list ini
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-medium)' 
          }}>
            {customCategories.map(cat => (
              <div key={cat.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem', borderBottom: '1px solid var(--color-border)',
                  backgroundColor: selectedCategoryId === cat.id ? 'var(--color-bg-light)' : 'transparent'
              }}>
                {/* Area Klik untuk Edit */}
                <div onClick={() => handleEditClick(cat)} style={{display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, cursor: 'pointer'}}>
                  <span style={{
                      backgroundColor: cat.color || '#ccc', width: '32px', height: '32px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#fff'
                  }}>
                    {cat.icon}
                  </span>
                  <div>
                    <div style={{fontWeight: '500'}}>{cat.name}</div>
                    <div style={{fontSize: '0.8rem', opacity: 0.7}}>
                        {cat.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                    </div>
                  </div>
                </div>
                {/* Tombol Hapus */}
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }}
                  style={{ 
                      background: 'rgba(255,0,0,0.1)', border: 'none', color: 'var(--color-accent-error)', 
                      cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem'
                  }}
                  title="Hapus Kategori"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{textAlign: 'center', opacity: 0.6, padding: '1rem', background: 'var(--color-bg-light)', borderRadius: 'var(--radius-medium)'}}>
            Belum ada kategori khusus. Buat satu di atas!
          </p>
        )}

      </div>
    </div>
  );
};

export default CategoryForm;