import axios from 'axios';
import { supabase } from '../supabaseClient';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});


axiosClient.interceptors.request.use(
  async (config) => {
    
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting session in axios interceptor:', error);
      return config; 
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