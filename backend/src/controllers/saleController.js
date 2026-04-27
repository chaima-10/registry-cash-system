const saleService = require('../services/saleService');

// Process Checkout & Create Sale
exports.createSale = async (req, res) => {
    try {
        const result = await saleService.createSale(req.user.id, req.body);
        res.status(201).json({
            message: 'Sale completed successfully',
            sale: result
        });
    } catch (error) {
        console.error('Sale creation error:', error);
        const status = error.message === 'Invalid payment method' ? 400 : 500;
        res.status(status).json({
            message: error.message || 'Error processing sale',
            error: error.message
        });
    }
};

// Get all sales (Admin)
exports.getAllSales = async (req, res) => {
    try {
        const sales = await saleService.getAllSales();
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sales', error: error.message });
    }
};

// Get sale by ID
exports.getSaleById = async (req, res) => {
    try {
        const sale = await saleService.getSaleById(parseInt(req.params.id));
        res.json(sale);
    } catch (error) {
        if (error.message === 'Sale not found') {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error fetching sale', error: error.message });
    }
};
