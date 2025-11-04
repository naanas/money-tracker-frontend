import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
// [BARU] Impor supabase client untuk memanggil fungsi reset
import { supabase } from '../supabaseClient';

const Login = () => {
  // [BARU] State untuk mengontrol tampilan (login atau reset)
  const [view, setView] = useState('login'); // 'login' or 'reset'
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(''); // Untuk pesan sukses reset
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
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

  // [BARU] Fungsi untuk menangani permintaan reset password
  const handleResetRequest = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    // URL ini HARUS di-whitelist di Supabase
    const redirectTo = 'https://catat-uang-kamu.vercel.app/reset-password';

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Link reset password telah dikirim! Silakan cek email Anda.');
    }
    setLoading(false);
  };

  // [BARU] Tampilan form untuk minta reset
  const renderResetForm = () => (
    <form onSubmit={handleResetRequest}>
      <p className="auth-welcome">Lupa Password?</p>
      <h2>Reset Password Anda</h2>
      <p style={{textAlign: 'center', marginTop: '-1.5rem', marginBottom: '1.5rem', fontSize: '0.9rem'}}>
        Masukkan email Anda. Kami akan mengirimkan link untuk reset password.
      </p>

      {error && (
        <div className="auth-error-box">
          <p>{error}</p>
        </div>
      )}
      {message && <p className="success">{message}</p>}

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
              if (message) setMessage('');
            }}
            placeholder="Email terdaftar Anda"
            required
          />
        </div>
      </div>
      
      <button type="submit" disabled={loading} style={{marginTop: '0.5rem'}}>
        {loading ? <div className="btn-spinner"></div> : 'Kirim Email Reset'}
      </button>
      
      <p className="auth-switch-page">
        Ingat passwordnya? <a href="#" onClick={(e) => { e.preventDefault(); setView('login'); setError(''); setMessage(''); }}>Login di sini</a>
      </p>
    </form>
  );

  // [BARU] Tampilan form login
  const renderLoginForm = () => (
    <form onSubmit={handleSubmit}>
      <p className="auth-welcome">Selamat Datang Kembali 👋</p>
      <h2>Login ke Akun Anda</h2>
      
      {error && (
        <div className="auth-error-box">
          <p>{error}</p>
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
        <a href="#" className="auth-forgot-password" onClick={(e) => { e.preventDefault(); setView('reset'); setError(''); }}>
          Lupa Password?
        </a>
      </div>
      
      <button type="submit" disabled={loading} style={{marginTop: '0.5rem'}}>
        {loading ? <div className="btn-spinner"></div> : 'Login'}
      </button>
      
      <p className="auth-switch-page">
        Belum punya akun? <Link to="/register">Daftar di sini</Link>
      </p>
    </form>
  );

  // [MODIFIKASI] Render berdasarkan state 'view'
  return (
    view === 'login' ? renderLoginForm() : renderResetForm()
  );
};

export default Login;