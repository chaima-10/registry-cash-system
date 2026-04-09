import api from './axios';

export const getAllProducts = async () => {
    const response = await api.get('/products-db');
    return response.data;
};

export const getProductByBarcode = async (barcode) => {
    const response = await api.get(`/products-db?barcode=${barcode}`);
    return response.data;
};

export const createProduct = async (productData) => {
    const isFormData = productData instanceof FormData;
    const response = await api.post('/products-db', productData, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return response.data;
};

export const updateProduct = async (id, productData) => {
    const isFormData = productData instanceof FormData;
    const response = await api.put(`/products-db/${id}`, productData, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return response.data;
};

export const deleteProduct = async (id) => {
    const response = await api.delete(`/products-db/${id}`);
    return response.data;
};
