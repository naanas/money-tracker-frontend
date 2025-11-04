import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Harap tunggu, memverifikasi token...');
  const [tokenVerified, setTokenVerified] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase akan memancarkan event 'PASSWORD_RECOVERY'
    // saat halaman ini dimuat dari link email
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setError('');
        setMessage('Token terverifikasi. Silakan masukkan password baru Anda.');
        setTokenVerified(true);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Password berhasil diperbarui! Anda akan diarahkan ke halaman Login.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handlePasswordUpdate}>
      <h2>Buat Password Baru</h2>
      
      {error && (
        <div className="auth-error-box">
          <p>{error}</p>
        </div>
      )}
      {message && <p className={error ? 'error' : 'success'}>{message}</p>}

      {/* Hanya tampilkan form jika token sudah diverifikasi */}
      {tokenVerified && (
        <>
          <div className="form-group">
            <label>Password Baru</label>
            <div className="password-wrapper">
              <div className="form-input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
          
          <button type="submit" disabled={loading} style={{marginTop: '0.5rem'}}>
            {loading ? <div className="btn-spinner"></div> : 'Simpan Password Baru'}
          </button>
        </>
      )}
    </form>
  );
};

export default ResetPassword;