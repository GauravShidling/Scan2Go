import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Students API
export const studentsAPI = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  search: (identifier) => api.get(`/students/search/${identifier}`),
  update: (id, data) => api.put(`/students/${id}`, data),
  deactivate: (id) => api.delete(`/students/${id}`),
  getMeals: (id, params) => api.get(`/students/${id}/meals`, { params }),
};

// Vendors API
export const vendorsAPI = {
  getAll: () => api.get('/vendors'),
  getById: (id) => api.get(`/vendors/${id}`),
  getDashboard: (id) => api.get(`/vendors/${id}/dashboard`),
  searchStudents: (id, query) => api.get(`/vendors/${id}/students/search`, { params: { q: query } }),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
};

// Verification API
export const verificationAPI = {
  verify: (data) => api.post('/verification/verify', data),
  getHistory: (vendorId, params) => api.get(`/verification/history/${vendorId}`, { params }),
  getStats: (vendorId) => api.get(`/verification/stats/${vendorId}`),
};

// Admin API
export const adminAPI = {
  uploadCSV: (formData) => api.post('/admin/upload-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  exportStudents: (params) => api.get('/admin/export-students', { params }),
  getStats: () => api.get('/admin/stats'),
  bulkDeactivate: (studentIds) => api.post('/admin/bulk-deactivate', { studentIds }),
};

export default api;
