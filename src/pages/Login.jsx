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
    
    // [MODIFIKASI] Validasi client-side sederhana
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
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}
      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          value={email}
          // [MODIFIKASI] Hapus error saat mengetik
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError('');
          }}
          required
        />
      </div>
      
      <div className="form-group">
        <label>Password</label>
        <div className="password-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            // [MODIFIKASI] Hapus error saat mengetik
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
            required
          />
          <button 
            type="button" 
            className="password-toggle-btn" 
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      <p>
        Belum punya akun? <Link to="/register">Daftar di sini</Link>
      </p>
    </form>
  );
};

export default Login;