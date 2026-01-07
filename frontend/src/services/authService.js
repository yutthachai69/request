// frontend/src/services/authService.js
import api from './api';

const login = async (username, password) => {
  const response = await api.post('/auth/login', { username, password });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response.data;
};

const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem('user'));
};

const changePassword = (passwordData) => {
    return api.put('/auth/change-password', passwordData);
};

const getMyStats = () => {
    return api.get('/auth/my-stats');
};

const authService = {
  login,
  logout,
  getCurrentUser,
  changePassword,
  getMyStats,
};

export default authService;