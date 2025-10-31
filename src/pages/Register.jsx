import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  
  // [MODIFIKASI] 'error' diubah menjadi 'apiError' untuk pesan dari server
  const [apiError, setApiError] = useState(''); 
  // [BARU] State untuk error validasi form
  const [formError, setFormError] = useState({}); 
  
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  // [BARU] Fungsi untuk validasi
  const validateForm = () => {
    const errors = {};
    if (fullName.trim().length < 3) {
      errors.fullName = 'Nama lengkap minimal 3 karakter.';
    }
    if (password.length < 8) {
      errors.password = 'Password minimal 8 karakter.';
    }
    // Anda bisa menambahkan validasi email di sini jika mau
    
    setFormError(errors);
    // Mengembalikan true jika tidak ada error (form valid)
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setMessage('');
    
    // [MODIFIKASI] Cek validasi form dulu
    if (!validateForm()) {
      return; // Stop submit jika form tidak valid
    }
    
    setLoading(true);
    
    try {
      const data = await register(email, password, fullName);
      setMessage(data.message); // Tampilkan pesan "Cek email"
    } catch (err) {
      console.error(err);
      // [MODIFIKASI] Gunakan state 'apiError'
      setApiError(err.response?.data?.error || err.message || 'Failed to register');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>
      {apiError && <p className="error">{apiError}</p>}
      {message && <p className="success">{message}</p>}
      
      <div className="form-group">
        <label>Full Name</label>
        <input
          type="text"
          value={fullName}
          // [MODIFIKASI] Hapus error saat mengetik
          onChange={(e) => {
            setFullName(e.target.value);
            if (formError.fullName) setFormError(p => ({...p, fullName: null}));
          }}
          required
        />
        {/* [BARU] Tampilkan pesan error validasi */}
        {formError.fullName && <small className="error-text">{formError.fullName}</small>}
      </div>
      
      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {/* (Bisa ditambahkan validasi email di sini) */}
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
              if (formError.password) setFormError(p => ({...p, password: null}));
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
        {/* [BARU] Tampilkan pesan error validasi */}
        {formError.password && <small className="error-text">{formError.password}</small>}
      </div>

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