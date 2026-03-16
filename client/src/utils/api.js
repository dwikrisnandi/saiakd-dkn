import axios from 'axios';

const api = axios.create({
  // Production: use the live domain. Development: use localhost.
  baseURL: import.meta.env.PROD 
    ? 'https://siakad.arthavirddhisampada.online/api' 
    : 'http://localhost:7542/api',
});

// Interceptor to add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
