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
    // Use the backend profile route (which is located in either /auth/profile or /users/profile)
    // Currently backend has it at /auth/profile as well as /users/profile. We will use /auth/profile.
    const response = await api.get('/auth/profile');
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
