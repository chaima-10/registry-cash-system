const saleRepository = require('../repositories/saleRepository');

class SaleService {
    async createSale(userId, data) {
        const { paymentMethod, currency, exchangeRate, amountTendered, changeAmount } = data;

        if (!['CASH', 'CARD', 'VOUCHER'].includes(paymentMethod)) {
            throw new Error('Invalid payment method');
        }

        return await saleRepository.createSaleTransaction(
            userId, 
            paymentMethod, 
            currency, 
            exchangeRate, 
            amountTendered, 
            changeAmount
        );
    }

    async getAllSales() {
        return await saleRepository.getAllSales();
    }

    async getSaleById(id) {
        const sale = await saleRepository.getSaleById(id);
        if (!sale) {
            throw new Error('Sale not found');
        }
        return sale;
    }
}

module.exports = new SaleService();
