import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import axiosClient from '../api/axiosClient';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Mulai dengan loading=true
  const navigate = useNavigate();

  useEffect(() => {
    // Kita HAPUS panggilan supabase.auth.getSession() yang lama.
    // Kita HANYA mengandalkan onAuthStateChange.
    
    // Listener ini akan langsung berjalan saat dimuat (dengan event INITIAL_SESSION)
    // dan juga berjalan saat login, logout, atau verifikasi.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth Event:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false); // HANYA set loading=false di sini.
      }
    );

    // Cleanup listener
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // Hapus 'navigate' dari dependencies, tidak diperlukan di sini

  // Fungsi register, memanggil backend Anda
  const register = async (email, password, fullName) => {
    const { data } = await axiosClient.post('/api/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    return data; 
  };

  // Fungsi login, memanggil backend Anda
  const login = async (email, password) => {
    const { data } = await axiosClient.post('/api/auth/login', {
      email,
      password,
    });
    
    // Set sesi di Supabase client, ini akan memicu onAuthStateChange
    await supabase.auth.setSession(data.data.session);

    // Kita tidak perlu set user/session di sini lagi, listener akan melakukannya.
    // Cukup navigasi.
    navigate('/dashboard');
    return data;
  };

  // Fungsi logout
  const logout = async () => {
    await supabase.auth.signOut();
    // Listener akan otomatis mendeteksi logout dan set user/session ke null
    navigate('/login');
  };

  const value = {
    session,
    user,
    loading,
    register,
    login,
    logout,
  };

  // Tampilkan children HANYA jika tidak loading.
  // Ini memastikan PrivateRoute mendapat state yang sudah final.
  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}