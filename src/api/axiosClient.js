import axios from 'axios';
// Impor supabase client langsung
import { supabase } from '../supabaseClient';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Interceptor untuk menambahkan token ke setiap request
// Ubah menjadi fungsi 'async'
axiosClient.interceptors.request.use(
  async (config) => {
    // Jangan baca dari localStorage
    // const sessionData = localStorage.getItem('sb-bqjuxfaitxjbsqlkypkf-auth-token');
    
    // Minta sesi terbaru langsung dari Supabase
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting session in axios interceptor:', error);
      return config; // Lanjutkan tanpa token jika ada error
    }
    
    if (session && session.access_token) {
      const token = session.access_token;
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosClient;