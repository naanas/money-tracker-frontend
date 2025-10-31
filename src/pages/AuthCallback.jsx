import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AuthCallback = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // AuthContext.jsx sudah menangani event 'SIGNED_IN'
    // Kita hanya perlu menunggu sampai user-nya ada, lalu redirect.
    if (!loading && user) {
      navigate('/dashboard');
    }
    // Jika terjadi error (token salah), user akan tetap null
    // dan PrivateRoute akan redirect ke /login
  }, [user, loading, navigate]);

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Memverifikasi...</h2>
        <p>Harap tunggu sebentar...</p>
      </div>
    </div>
  );
};

export default AuthCallback;