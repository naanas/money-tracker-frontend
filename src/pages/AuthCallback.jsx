import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AuthCallback = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    // 1. Cek jika context sudah selesai loading DAN user ada
    if (!loading && user && !isVerified) {
      // Set state verified jadi true untuk memicu animasi checkmark
      setIsVerified(true);
    }
  }, [user, loading, isVerified]);

  useEffect(() => {
    // 2. Efek ini HANYA berjalan jika isVerified menjadi true
    if (isVerified) {
      // Tunggu 2 detik untuk menampilkan checkmark
      const timer = setTimeout(() => {
        // 3. Setelah 2 detik, redirect ke dashboard
        navigate('/dashboard');
      }, 2000); // 2000ms = 2 detik

      // Selalu cleanup timeout jika komponen unmount
      return () => clearTimeout(timer);
    }
  }, [isVerified, navigate]);

  return (
    <div className="auth-layout">
      {/* Kita gunakan class .auth-form agar styling-nya konsisten */}
      <div className="auth-form verification-box">
        {!isVerified ? (
          <>
            {/* Tampilan "Sedang Verifikasi" */}
            <div className="spinner"></div>
            <h2>Memverifikasi...</h2>
            <p>Harap tunggu sebentar...</p>
          </>
        ) : (
          <>
            {/* Tampilan "Berhasil Verifikasi" */}
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
    </div>
  );
};

export default AuthCallback;