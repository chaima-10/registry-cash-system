import api from './axios';

export const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
    }
    return response.data;
};

export const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
};

export const logoutUser = async () => {
    try {
        await api.post('/auth/logout');
    } catch (error) {
        console.error("Logout error", error);
    }
    localStorage.removeItem('token');
};

export const getProfile = async () => {
    // Use the comprehensive /users/profile endpoint instead of the raw /auth/profile
    // to ensure the 'stats' object (Primes, revenue, etc.) is included.
    const response = await api.get('/users/profile');
    return response.data;
};

export const updateProfile = async (data) => {
    const response = await api.put('/users/profile', data);
    return response.data;
};

export const changePassword = async (data) => {
    const response = await api.put('/users/change-password', data);
    return response.data;
};

export const verifyEmail = async (token) => {
    const response = await api.get(`/auth/verify-email?token=${token}`);
    return response.data;
};

export const forgotPassword = async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
};

export const resetPassword = async (data) => {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
};


