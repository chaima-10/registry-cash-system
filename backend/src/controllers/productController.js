const productService = require('../services/productService');

// Create Product
exports.createProduct = async (req, res) => {
    try {
        const product = await productService.createProduct(req.body, req.file);
        res.status(201).json(product);
    } catch (error) {
        console.error('Create Product Error:', error);
        res.status(400).json({ message: error.message });
    }
};

// Get All Products
exports.getAllProducts = async (req, res) => {
    try {
        const products = await productService.getAllProducts();
        res.json(products);
    } catch (error) {
        console.error('CRITICAL Error fetching products:', error);
        res.status(500).json({ 
            message: 'Erreur lors du chargement des produits.', 
            error: error.message,
            stack: error.stack
        });
    }
};

// Get Product by Barcode
exports.getProductByBarcode = async (req, res) => {
    try {
        const product = await productService.getProductByBarcode(req.params.barcode);
        res.json(product);
    } catch (error) {
        if (error.message === 'Product not found') {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error fetching product', error: error.message });
    }
};

// Update Product
exports.updateProduct = async (req, res) => {
    try {
        const product = await productService.updateProduct(parseInt(req.params.id), req.body, req.file);
        res.json(product);
    } catch (error) {
        if (error.code === 'P2025' || error.message === 'Product not found') {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(400).json({ message: error.message });
    }
};

// Delete Product
exports.deleteProduct = async (req, res) => {
    try {
        await productService.deleteProduct(parseInt(req.params.id));
        res.json({ message: 'Product deleted' });
    } catch (error) {
        if (error.code === 'P2025' || error.message === 'Product not found') {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(500).json({ message: 'Error deleting product', error: error.message });
    }
};