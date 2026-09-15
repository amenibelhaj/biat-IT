// Base URL for the backend API.
// Set REACT_APP_API_URL in your environment (.env locally, or your hosting
// platform's environment settings in production).
// Falls back to localhost for local development.
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
