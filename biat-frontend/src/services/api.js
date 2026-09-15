// src/services/api.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API = axios.create({
  baseURL: API_BASE_URL
});

// NOTE: only endpoints that exist on the backend (see backend/server.js) are
// listed here. Add new ones here as the backend grows, rather than calling
// fetch() with a hardcoded URL inside a component.
export const assetService = {
  getAssets: (params) => API.get('/assets', { params }),
  importFile: (formData) => API.post('/import/excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

export const dashboardService = {
  getExecutive: () => API.get('/strategic/dashboard/executive'),
  getRiskHeatmap: () => API.get('/strategic/dashboard/risk-heatmap'),
  getBudgetForecast: () => API.get('/strategic/dashboard/budget-forecast'),
  getReplacementRoadmap: () => API.get('/strategic/dashboard/replacement-roadmap'),
  getLifecycleAnalysis: () => API.get('/strategic/dashboard/lifecycle-analysis'),
  getFinancialSummary: () => API.get('/strategic/dashboard/financial-summary')
};

export default API;
