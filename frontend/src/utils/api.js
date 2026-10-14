import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
