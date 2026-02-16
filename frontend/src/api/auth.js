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
    // Check both auth and users routes depending on backend implementation
    // Switching to /users/profile as per new implementation
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
