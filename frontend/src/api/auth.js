import api from './axios';

export const loginUser = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
    }
    return response.data;
};

export const registerUser = async (userData) => {
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
    const response = await api.get('/auth/profile');
    return response.data;
};
