import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// API endpoints
export const AUTH_API = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: (data) => api.post('/auth/refresh', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const MEETING_API = {
  getAll: (params) => api.get('/meetings', { params }),
  getById: (id) => api.get(`/meetings/${id}`),
  getJoinInfo: (id) => api.get(`/meetings/${id}/join`),
  getJoinInfoByCode: (code) => api.get(`/meetings/code/${code}/join`),
  joinAsParticipant: (id, data) => api.post(`/meetings/${id}/participants`, data),
  create: (data) => api.post('/meetings', data),
  update: (id, data) => api.put(`/meetings/${id}`, data),
  delete: (id) => api.delete(`/meetings/${id}`),
  updateStatus: (id, status) => api.patch(`/meetings/${id}/status`, null, { params: { status } }),
  getStats: () => api.get('/meetings/stats'),
  getRecent: (limit) => api.get('/meetings/recent', { params: { limit } }),
  getExportedFiles: (id) => api.get(`/meetings/${id}/files`),
};

export const SUMMARY_API = {
  generate: (meetingId) =>
    api.post('/summaries/generate', null, {
      params: { meeting_id: meetingId },
    }),
  getByMeeting: (meetingId, params) => api.get(`/summaries/meeting/${meetingId}`, { params }),
  getAll: (params) => api.get('/summaries', { params }),
  getById: (id) => api.get(`/summaries/${id}`),
  delete: (id) => api.delete(`/summaries/${id}`),
  uploadAudio: (meetingId, file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/summaries/upload-audio?meeting_id=${meetingId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
};
