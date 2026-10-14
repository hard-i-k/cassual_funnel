import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept errors to provide clear, actionable error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.userMessage =
        'Request timed out. Please ensure the backend server is running on port 5000 and connected to MongoDB.';
    } else if (!error.response) {
      error.userMessage =
        `Cannot reach the backend server at ${baseURL}. Please verify the backend is running.`;
    } else if (error.response.status === 503) {
      error.userMessage =
        error.response.data?.error || 'Database is currently disconnected. Please start MongoDB.';
    }
    return Promise.reject(error);
  }
);

export const getSessions = async () => {
  const response = await api.get('/api/sessions');
  return response.data;
};

export const getSessionEvents = async (sessionId) => {
  const response = await api.get(`/api/sessions/${encodeURIComponent(sessionId)}/events`);
  return response.data;
};

export const getPages = async () => {
  const response = await api.get('/api/pages');
  return response.data;
};

export const getHeatmap = async (pageUrl) => {
  const response = await api.get('/api/heatmap', {
    params: { page_url: pageUrl },
  });
  return response.data;
};

export default api;
