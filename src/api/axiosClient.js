import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Interceptor untuk menambahkan token ke setiap request
axiosClient.interceptors.request.use(
  (config) => {
    // Ambil session dari Supabase (yang disimpan di local storage)
    const sessionData = localStorage.getItem('sb-bqjuxfaitxjbsqlkypkf-auth-token');
    
    if (sessionData) {
      const session = JSON.parse(sessionData);
      const token = session.access_token;
      
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosClient;