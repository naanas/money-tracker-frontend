import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AuthCallback = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (!loading && user && !isVerified) {
      setIsVerified(true);
    }
  }, [user, loading, isVerified]);

  useEffect(() => {
    if (isVerified) {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 2000); 
      return () => clearTimeout(timer);
    }
  }, [isVerified, navigate]);

  return (
    // Kita hapus <div className="auth-form"> dan ganti dengan wrapper simpel
    <div className="verification-box">
      {!isVerified ? (
        <>
          <div className="spinner"></div>
          <h2>Memverifikasi...</h2>
          <p>Harap tunggu sebentar...</p>
        </>
      ) : (
        <>
          <div className="checkmark-wrapper">
            <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
              <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>
          <h2>Verifikasi Berhasil!</h2>
          <p>Anda akan diarahkan ke dashboard...</p>
        </>
      )}
    </div>
  );
};

export default AuthCallback;