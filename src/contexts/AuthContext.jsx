import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import axiosClient from '../api/axiosClient';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Ambil sesi yang ada
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Dengarkan perubahan state auth (login, logout, DAN VERIFIKASI EMAIL)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth Event:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Jika user baru saja SIGNED_IN (termasuk dari callback),
        // arahkan ke dashboard
        if (event === 'SIGNED_IN') {
          navigate('/dashboard');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  // Fungsi register, memanggil backend Anda
  const register = async (email, password, fullName) => {
    // Memanggil API register dari backend Anda
    const { data } = await axiosClient.post('/api/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    return data; // Mengembalikan pesan "cek email"
  };

  // Fungsi login, memanggil backend Anda
  const login = async (email, password) => {
    // Memanggil API login dari backend Anda
    const { data } = await axiosClient.post('/api/auth/login', {
      email,
      password,
    });
    
    // Setelah sukses, backend mengembalikan sesi Supabase
    // Kita set sesi itu di Supabase client frontend
    await supabase.auth.setSession(data.data.session);

    setSession(data.data.session);
    setUser(data.data.session.user);
    navigate('/dashboard');
    return data;
  };

  // Fungsi logout
  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
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

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}