import api from './axios';

export const getAllCategories = async () => {
    const response = await api.get('/categories');
    return response.data;
};

export const createCategory = async (categoryData) => {
    const response = await api.post('/categories', categoryData);
    return response.data;
};

export const createSubcategory = async (subcategoryData) => {
    const response = await api.post('/categories/sub', subcategoryData);
    return response.data;
};
