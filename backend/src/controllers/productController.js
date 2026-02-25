const prisma = require('../config/prisma');

// Create Product
exports.createProduct = async (req, res) => {
    try {
        const { barcode, name, price, stockQuantity, categoryId, subcategoryId } = req.body;

        // Check if already exists
        const existing = await prisma.product.findUnique({ where: { barcode } });
        if (existing) {
            return res.status(400).json({ message: 'Product with this barcode already exists' });
        }

        const product = await prisma.product.create({
            data: {
                barcode,
                name,
                price: parseFloat(price),
                stockQuantity: parseInt(stockQuantity),
                categoryId: categoryId ? parseInt(categoryId) : null,
                subcategoryId: subcategoryId ? parseInt(subcategoryId) : null,
            },
        });
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error creating product', error: error.message });
    }
};

// Get All Products
exports.getAllProducts = async (req, res) => {
    try {
        const products = await prisma.product.findMany();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products', error: error.message });
    }
};

// Get Product by Barcode
exports.getProductByBarcode = async (req, res) => {
    try {
        const product = await prisma.product.findUnique({
            where: { barcode: req.params.barcode },
        });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching product', error: error.message });
    }
};

// Update Product
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, stockQuantity, categoryId, subcategoryId } = req.body;

        const product = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                name,
                price,
                stockQuantity,
                categoryId: categoryId ? parseInt(categoryId) : null,
                subcategoryId: subcategoryId ? parseInt(subcategoryId) : null,
            },
        });

        res.json(product);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(500).json({ message: 'Error updating product', error: error.message });
    }
};

// Delete Product
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.product.delete({
            where: { id: parseInt(id) },
        });
        res.json({ message: 'Product deleted' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(500).json({ message: 'Error deleting product', error: error.message });
    }
};
