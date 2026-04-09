import axios from 'axios';

<<<<<<< HEAD
// Use Vercel serverless functions as fallback
const baseURL = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api'; // Vercel serverless functions

const api = axios.create({
    baseURL,
=======
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: `${API_URL.replace(/\/$/, '')}/api`,
>>>>>>> dfc2ff4 (ajout module AI marketing)

    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the JWT token
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

// Add a response interceptor to handle 401 errors globally
api.interceptors.response.use(
    (response) => {
        // If we accidentally hit a Vite Dev Server SPA route, it returns HTML. Reject it.
        if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
            console.error("API received HTML instead of JSON. Check the API URL.");
            return Promise.reject(new Error("Received HTML instead of JSON. API might be incorrectly routed."));
        }
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            // Force redirect to login if not already there
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
