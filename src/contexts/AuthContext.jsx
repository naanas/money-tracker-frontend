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

    // Dengarkan perubahan state auth
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth Event:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // === PERBAIKAN: Hapus blok 'if' di bawah ini ===
        // Navigasi akan diurus oleh halamannya masing-masing
        // (AuthCallback.jsx atau Login.jsx)
        /*
        if (event === 'SIGNED_IN') {
          navigate('/dashboard');
        }
        */
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]); // Hapus navigate dari dependencies jika mau

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