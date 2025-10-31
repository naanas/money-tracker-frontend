import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // [BARU] State untuk toggle
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      {/* === [INPUT PASSWORD DIMODIFIKASI] === */}
      <div className="form-group">
        <label>Password</label>
        <div className="password-wrapper">
          <input
            type={showPassword ? 'text' : 'password'} // [BARU] Jenis input dinamis
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {/* [BARU] Tombol untuk toggle password */}
          <button 
            type="button" 
            className="password-toggle-btn" 
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      {/* === [AKHIR MODIFIKASI] === */}
      
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