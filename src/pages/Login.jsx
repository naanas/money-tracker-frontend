import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
// [BARU] Impor supabase client
import { supabase } from '../supabaseClient'; 

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  // [BARU] State untuk pesan sukses (cth: link terkirim)
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage(''); // [BARU] Reset pesan
    
    if (!email || !password) {
      setError("Email dan Password harus diisi.");
      return;
    }
    
    setLoading(true);
    try {
      await login(email, password);
      // Navigasi sudah dihandle di AuthContext
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Failed to login');
    }
    setLoading(false);
  };

  // === [FUNGSI BARU] ===
  const handleForgotPassword = async () => {
    setError('');
    setMessage('');
    
    const userEmail = prompt("Silakan masukkan email Anda untuk reset password:");
    if (!userEmail) return; // User membatalkan prompt

    setLoading(true);
    try {
      // Panggil fungsi reset password dari Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        // Arahkan pengguna kembali ke halaman login setelah mereka mengklik link di email
        redirectTo: window.location.origin + '/login',
      });
      
      if (error) throw error;
      
      setMessage("Link reset password telah dikirim ke email Anda. Silakan periksa inbox.");
    } catch (err) {
      console.error("Forgot password error:", err);
      setError(err.message || "Gagal mengirim link reset password.");
    }
    setLoading(false);
  };
  // === [AKHIR FUNGSI BARU] ===

  return (
    <form onSubmit={handleSubmit}>
      <p className="auth-welcome">Selamat Datang Kembali 👋</p>
      <h2>Login ke Akun Anda</h2>
      
      {/* Tampilkan pesan error */}
      {error && (
        <div className="auth-error-box">
          <p>{error}</p>
        </div>
      )}
      
      {/* [BARU] Tampilkan pesan sukses */}
      {message && (
        <div className="auth-success-box">
          <p>{message}</p>
        </div>
      )}

      <div className="form-group">
        <label>Email</label>
        <div className="form-input-wrapper">
          <span className="input-icon">✉️</span> 
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
              if (message) setMessage(''); // [BARU]
            }}
            placeholder="contoh@email.com"
            required
          />
        </div>
      </div>
      
      <div className="form-group">
        <label>Password</label>
        <div className="password-wrapper">
          <div className="form-input-wrapper">
            <span className="input-icon">🔒</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
                if (message) setMessage(''); // [BARU]
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

      <div className="auth-extra-links">
        {/* [MODIFIKASI] Ubah <a> jadi <button> */}
        <button 
          type="button" 
          className="auth-forgot-password" 
          onClick={handleForgotPassword}
          disabled={loading}
        >
          Lupa Password?
        </button>
      </div>
      
      <button type="submit" disabled={loading} style={{marginTop: '0.5rem'}}>
        {loading ? <div className="btn-spinner"></div> : 'Login'}
      </button>
      
      <p className="auth-switch-page">
        Belum punya akun? <Link to="/register">Daftar di sini</Link>
      </p>
    </form>
  );
};

export default Login;