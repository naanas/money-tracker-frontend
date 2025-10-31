import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import axiosClient from '../api/axiosClient';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); 
  const navigate = useNavigate();

  // === [STATE BARU UNTUK ANIMASI SUKSES] ===
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTimeoutId, setSuccessTimeoutId] = useState(null);
  // === [AKHIR STATE BARU] ===

  useEffect(() => {
    // Listener ini sudah benar (dari perbaikan sebelumnya)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth Event:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false); 
      }
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // === [FUNGSI BARU UNTUK MEMICU ANIMASI] ===
  const triggerSuccessAnimation = () => {
    // Jika animasi sedang berjalan, reset timernya
    if (successTimeoutId) {
      clearTimeout(successTimeoutId);
    }
    
    setShowSuccess(true);
    
    // Sembunyikan animasi setelah 1.5 detik
    const newTimeoutId = setTimeout(() => {
      setShowSuccess(false);
      setSuccessTimeoutId(null);
    }, 1500); // 1.5 detik
    setSuccessTimeoutId(newTimeoutId);
  };
  // === [AKHIR FUNGSI BARU] ===


  // ... (fungsi register, login, logout tidak berubah)
  const register = async (email, password, fullName) => {
    const { data } = await axiosClient.post('/api/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    return data; 
  };
  const login = async (email, password) => {
    const { data } = await axiosClient.post('/api/auth/login', {
      email,
      password,
    });
    await supabase.auth.setSession(data.data.session);
    navigate('/dashboard');
    return data;
  };
  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const value = {
    session,
    user,
    loading,
    register,
    login,
    logout,
    triggerSuccessAnimation, // [BARU] Ekspor fungsi ini
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}

      {/* === [ANIMASI SUKSES RENDER GLOBAL] === */}
      {/* Tampil di atas segalanya saat showSuccess = true */}
      {showSuccess && (
        <div className="success-animation-overlay">
          <div className="checkmark-wrapper">
            <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
              <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>
        </div>
      )}
      {/* === [AKHIR ANIMASI SUKSES] === */}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}