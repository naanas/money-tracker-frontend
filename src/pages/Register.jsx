import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // [BARU] State untuk toggle
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      const data = await register(email, password, fullName);
      setMessage(data.message); // Tampilkan pesan "Cek email"
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Failed to register');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
      <div className="form-group">
        <label>Full Name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>
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
        {loading ? 'Registering...' : 'Register'}
      </button>
      <p>
        Sudah punya akun? <Link to="/login">Login di sini</Link>
      </p>
    </form>
  );
};

export default Register;