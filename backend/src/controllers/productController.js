const prisma = require('../config/prisma');

// Create Product
exports.createProduct = async (req, res) => {
    try {
        const { barcode, name, price, stockQuantity, categoryId, subcategoryId, remise, tva } = req.body;

        // Check if already exists
        const existing = await prisma.product.findUnique({ where: { barcode } });
        if (existing) {
            return res.status(400).json({ message: 'Product with this barcode already exists' });
        }

        let validRemise = 0;
        if (remise !== undefined && remise !== null) {
            validRemise = parseFloat(remise);
            if (isNaN(validRemise) || validRemise < 0 || validRemise > 100) {
                return res.status(400).json({ message: 'Remise must be a percentage between 0 and 100' });
            }
        }

        let validTva = 0;
        if (tva !== undefined && tva !== null && tva !== '') {
            validTva = parseFloat(tva);
            if (isNaN(validTva) || validTva < 0) {
                return res.status(400).json({ message: 'TVA must be a valid positive percentage' });
            }
        }

        const product = await prisma.product.create({
            data: {
                barcode,
                name,
                price: parseFloat(price),
                stockQuantity: parseInt(stockQuantity),
                categoryId: categoryId ? parseInt(categoryId) : null,
                subcategoryId: subcategoryId ? parseInt(subcategoryId) : null,
                remise: validRemise,
                tva: validTva,
            },
            include: {
                category: true,
                subcategory: true,
            }
        });
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error creating product', error: error.message });
    }
};

// Get All Products
exports.getAllProducts = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            include: {
                category: true,
                subcategory: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
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
            include: {
                category: true,
                subcategory: true,
            }
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
        const { name, price, stockQuantity, categoryId, subcategoryId, remise, tva } = req.body;

        let updateData = {
            name,
            price: price !== undefined ? parseFloat(price) : undefined,
            stockQuantity: stockQuantity !== undefined ? parseInt(stockQuantity) : undefined,
            categoryId: categoryId ? parseInt(categoryId) : null,
            subcategoryId: subcategoryId ? parseInt(subcategoryId) : null,
        };

        if (remise !== undefined && remise !== null && remise !== '') {
            let validRemise = parseFloat(remise);
            if (isNaN(validRemise) || validRemise < 0 || validRemise > 100) {
                return res.status(400).json({ message: 'Remise must be a percentage between 0 and 100' });
            }
            updateData.remise = validRemise;
        }

        if (tva !== undefined && tva !== null && tva !== '') {
            let validTva = parseFloat(tva);
            if (isNaN(validTva) || validTva < 0) {
                return res.status(400).json({ message: 'TVA must be a valid positive percentage' });
            }
            updateData.tva = validTva;
        }

        const product = await prisma.product.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                category: true,
                subcategory: true,
            }
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
