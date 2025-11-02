import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
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

  return (
    <form onSubmit={handleSubmit}>
      {/* === [PERUBAHAN DI SINI] === */}
      <p className="auth-welcome">Selamat Datang Kembali 👋</p>
      <h2>Login ke Akun Anda</h2>
      
      {error && (
        <div className="auth-error-box">
          <p>{error}</p>
        </div>
      )}

      <div className="form-group">
        <label>Email</label>
        {/* Wrapper baru untuk ikon */}
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
          {/* Wrapper baru untuk ikon */}
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
        {/* Tautan Lupa Password baru */}
        <a href="#" className="auth-forgot-password" onClick={(e) => e.preventDefault()}>
          Lupa Password?
        </a>
      </div>
      
      <button type="submit" disabled={loading} style={{marginTop: '0.5rem'}}>
        {loading ? <div className="btn-spinner"></div> : 'Login'}
      </button>
      
      <p className="auth-switch-page">
        Belum punya akun? <Link to="/register">Daftar di sini</Link>
      </p>
      {/* === [AKHIR PERUBAHAN] === */}
    </form>
  );
};

export default Login;