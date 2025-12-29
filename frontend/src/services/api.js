import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses
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

// Auth APIs
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getProfile: () => api.get('/auth/me'),
};

// Reports APIs
export const reportsAPI = {
    getAll: (params) => api.get('/reports', { params }),
    getById: (id) => api.get(`/reports/${id}`),
    getShared: () => api.get('/reports/shared'),
    upload: (formData) => api.post('/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    delete: (id) => api.delete(`/reports/${id}`),
    download: (id) => api.get(`/reports/${id}/download`, { responseType: 'blob' }),
};

// Vitals APIs
export const vitalsAPI = {
    getAll: (params) => api.get('/vitals', { params }),
    getById: (id) => api.get(`/vitals/${id}`),
    getTrends: (days) => api.get('/vitals/trends', { params: { days } }),
    getTypes: () => api.get('/vitals/types'),
    create: (data) => api.post('/vitals', data),
    update: (id, data) => api.put(`/vitals/${id}`, data),
    delete: (id) => api.delete(`/vitals/${id}`),
};

// Sharing APIs
export const sharingAPI = {
    create: (data) => api.post('/sharing', data),
    getByReport: (reportId) => api.get(`/sharing/report/${reportId}`),
    getSharedByMe: () => api.get('/sharing/by-me'),
    getSharedWithMe: () => api.get('/sharing/with-me'),
    revoke: (id) => api.delete(`/sharing/${id}`),
    update: (id, data) => api.put(`/sharing/${id}`, data),
};

export default api;
