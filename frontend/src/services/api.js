// frontend/src/services/api.js
import axios from 'axios';
import authService from './authService';


const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      authService.logout();
      // Dynamic base path: ใช้ /requestonline ใน production, / ใน development
      const basePath = import.meta.env.PROD ? '/requestonline' : '';
      window.location.href = `${basePath}/login`; 
    }
    return Promise.reject(error);
  }
);

export default api;