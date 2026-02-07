import api from './axios';

export const getAllCategories = async () => {
    const response = await api.get('/categories');
    return response.data;
};

export const createCategory = async (data) => {
    const response = await api.post('/categories', data);
    return response.data;
};

export const createSubcategory = async (data) => {
    const response = await api.post('/categories/sub', data);
    return response.data;
};
