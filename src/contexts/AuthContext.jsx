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

  const [authEvent, setAuthEvent] = useState(null); 

  const [showSuccess, setShowSuccess] = useState(false);
  const [successTimeoutId, setSuccessTimeoutId] = useState(null);

  useEffect(() => {
    // [PERBAIKAN LOGIKA]
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth Event:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false); 
        
        // Cek URL hash SECARA MANUAL untuk mengatasi race condition
        const hash = window.location.hash;
        
        if (hash.includes('type=recovery') && (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY')) {
          // Jika ini adalah event SIGNED_IN TAPI karena link recovery,
          // PAKSA event-nya menjadi PASSWORD_RECOVERY
          setAuthEvent('PASSWORD_RECOVERY');
        } else {
          setAuthEvent(event);
        }
      }
    );
    // [AKHIR PERBAIKAN LOGIKA]

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const triggerSuccessAnimation = () => {
    if (successTimeoutId) {
      clearTimeout(successTimeoutId);
    }
    setShowSuccess(true);
    const newTimeoutId = setTimeout(() => {
      setShowSuccess(false);
      setSuccessTimeoutId(null);
    }, 1500); 
    setSuccessTimeoutId(newTimeoutId);
  };

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
    triggerSuccessAnimation(); 
    navigate('/dashboard');
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const clearAuthEvent = () => {
    setAuthEvent(null);
    navigate('/login');
  };

  const value = {
    session,
    user,
    loading,
    authEvent,
    clearAuthEvent,
    register,
    login,
    logout,
    triggerSuccessAnimation,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}

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
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}