import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const ResetPasswordForm = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { clearAuthEvent } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setMessage("Password berhasil diperbarui! Silakan login dengan password baru Anda.");
      
      // Setelah 3 detik, bersihkan hash dan kembalikan ke form login
      setTimeout(() => {
        // [PERBAIKAN DI SINI] Hapus hash dari URL
        window.location.hash = '';
        clearAuthEvent();
      }, 3000);

    } catch (err) {
      console.error("Reset password error:", err);
      setError(err.message || "Gagal memperbarui password.");
    }
    setLoading(false);
  };

  // Jika pesan sukses ada, tampilkan itu saja
  if (message) {
    return (
      <div className="auth-success-box">
        <p>{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="auth-welcome">Buat Password Baru</p>
      <h2>Masukkan Password Baru Anda</h2>
      
      {error && (
        <div className="auth-error-box">
          <p>{error}</p>
        </div>
      )}

      <div className="form-group">
        <label>Password Baru</label>
        <div className="password-wrapper">
          <div className="form-input-wrapper">
            <span className="input-icon">🔒</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Minimal 8 karakter"
              required
            />
          </div>
          <button 
            type="button" 
            className="password-toggle-btn" 
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      
      <button type="submit" disabled={loading} style={{marginTop: '1rem'}}>
        {loading ? <div className="btn-spinner"></div> : 'Simpan Password Baru'}
      </button>
    </form>
  );
};

export default ResetPasswordForm;