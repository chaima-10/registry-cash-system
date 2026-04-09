import api from '../../axios';

export const getAllCategories = async () => {
    const response = await api.get('/categories-real');
    return response.data;
};

export const createCategory = async (categoryData) => {
    const response = await api.post('/categories-real', categoryData);
    return response.data;
};

export const createSubcategory = async (categoryId, subcategoryData) => {
    const response = await api.post(`/categories-real/${categoryId}/subcategories`, subcategoryData);
    return response.data;
};
