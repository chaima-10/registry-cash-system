import api from './axios';

export const processCheckout = async (paymentMethod, currency, exchangeRate) => {
    const response = await api.post('/sales', { paymentMethod, currency, exchangeRate });
    return response.data;
};

export const getAllSales = async () => {
    const response = await api.get('/sales');
    return response.data;
};

export const getSaleById = async (id) => {
    const response = await api.get(`/sales/${id}`);
    return response.data;
};
