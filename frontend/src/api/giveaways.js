import api from '../axios';

export const getAllGiveaways = async () => {
    const response = await api.get('/giveaways-real');
    return response.data;
};

export const getGiveawayById = async (id) => {
    const response = await api.get(`/giveaways-real/${id}`);
    return response.data;
};

export const createGiveaway = async (giveawayData) => {
    const response = await api.post('/giveaways-real', giveawayData);
    return response.data;
};

export const participateInGiveaway = async (id) => {
    const response = await api.post(`/giveaways-real/${id}/participate`);
    return response.data;
};

export const selectWinners = async (id) => {
    const response = await api.post(`/giveaways-real/${id}/select-winners`);
    return response.data;
};

export const deleteGiveaway = async (id) => {
    const response = await api.delete(`/giveaways-real/${id}`);
    return response.data;
};

export const getUserGiveawayHistory = async () => {
    const response = await api.get('/giveaways-real/my-history');
    return response.data;
};
