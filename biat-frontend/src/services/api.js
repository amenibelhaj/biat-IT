// src/services/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api'
});

export const assetService = {
  getAssets: (params) => API.get('/assets', { params }),
  getAssetById: (id) => API.get(`/assets/${id}`),
  createAsset: (data) => API.post('/assets', data),
  updateAsset: (id, data) => API.put(`/assets/${id}`, data),
  deleteAsset: (id) => API.delete(`/assets/${id}`),
  importFile: (formData) => API.post('/import/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

export const dashboardService = {
  getSummary: () => API.get('/dashboard/summary'),
  getByType: () => API.get('/dashboard/by-type'),
  getBySite: () => API.get('/dashboard/by-site'),
  getByCriticality: () => API.get('/dashboard/by-criticality'),
  getCriticalAtRisk: () => API.get('/dashboard/critical-at-risk')
};

export default API;
