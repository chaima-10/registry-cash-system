import api from './axios';

// Get all users
export const getUsers = async () => {
    const response = await api.get('/users');
    return response.data;
};

// Update user
export const updateUser = async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
};

// Delete user
export const deleteUser = async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
};
