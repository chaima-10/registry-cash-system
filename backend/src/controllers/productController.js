const prisma = require('../config/prisma');

// Create Product
exports.createProduct = async (req, res) => {
    try {
        const { barcode, name, price, purchasePrice, stockQuantity, categoryId, subcategoryId, remise, tva } = req.body;

        // Strict EAN-13/UPC-A barcode validation: numeric only, exactly 12 or 13 digits
        if (!barcode || !/^\d{12,13}$/.test(barcode.trim())) {
            return res.status(400).json({ message: 'Barcode must be strictly EAN-13 (13 digits) or UPC-A (12 digits)' });
        }

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

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const product = await prisma.product.create({
            data: {
                barcode,
                name,
                price: parseFloat(price),
                purchasePrice: purchasePrice !== undefined && purchasePrice !== '' ? parseFloat(purchasePrice) : 0,
                stockQuantity: parseInt(stockQuantity),
                categoryId: categoryId ? parseInt(categoryId) : null,
                subcategoryId: subcategoryId ? parseInt(subcategoryId) : null,
                remise: validRemise,
                tva: validTva,
                imageUrl: imageUrl,
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
        const { name, price, purchasePrice, stockQuantity, categoryId, subcategoryId, remise, tva, barcode } = req.body;

        // If barcode is being updated, validate it
        if (barcode !== undefined && barcode !== null && barcode !== '') {
            if (!/^\d{12,13}$/.test(barcode.trim())) {
                return res.status(400).json({ message: 'Barcode must be strictly EAN-13 (13 digits) or UPC-A (12 digits)' });
            }
        }

        let updateData = {
            name,
            price: price !== undefined ? parseFloat(price) : undefined,
            purchasePrice: purchasePrice !== undefined && purchasePrice !== '' ? parseFloat(purchasePrice) : undefined,
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

        if (req.file) {
            updateData.imageUrl = `/uploads/${req.file.filename}`;
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
        const productId = parseInt(id);

        // Vérifier si le produit est lié à des ventes
        const existingSales = await prisma.saleItem.findFirst({
            where: { productId }
        });

        if (existingSales) {
            return res.status(400).json({ 
                message: 'Impossible de supprimer ce produit car il est lié à un historique de ventes existant. Vous devriez plutôt désactiver le produit ou mettre son stock à zéro.' 
            });
        }

        // Nettoyer les chariots actifs (qui n'ont pas encore été convertis en ventes)
        await prisma.cartItem.deleteMany({
            where: { productId }
        });

        // Supprimer le produit
        await prisma.product.delete({
            where: { id: productId },
        });
        
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(500).json({ message: 'Error deleting product', error: error.message });
    }
};
