const prisma = require('../config/prisma');

// Create Product
exports.createProduct = async (req, res) => {
    try {
        const { barcode, name, price, purchasePrice, stockQuantity, categoryId, subcategoryId, remise, tva } = req.body;

        // Logging for debug (visible in Vercel/Server logs)
        console.log('Creating product with barcode:', barcode);

        // Strict validation: must exist and be numeric
        if (!barcode || typeof barcode !== 'string' || !/^\d{12,13}$/.test(barcode.trim())) {
            return res.status(400).json({ 
                message: 'Le code-barres est obligatoire et doit être au format EAN-13 (13 chiffres) ou UPC-A (12 chiffres)' 
            });
        }

        const cleanBarcode = barcode.trim();

        // Check if already exists using findFirst for better error resilience if arg is somehow nullish
        const existing = await prisma.product.findFirst({ 
            where: { barcode: cleanBarcode, isDeleted: false } 
        });
        
        if (existing) {
            return res.status(400).json({ message: 'Un produit avec ce code-barres existe déjà' });
        }

        let validRemise = 0;
        if (remise !== undefined && remise !== null && remise !== '') {
            validRemise = parseFloat(remise);
            if (isNaN(validRemise) || validRemise < 0 || validRemise > 100) {
                return res.status(400).json({ message: 'La remise doit être un pourcentage entre 0 et 100' });
            }
        }

        let validTva = 0;
        if (tva !== undefined && tva !== null && tva !== '') {
            validTva = parseFloat(tva);
            if (isNaN(validTva) || validTva < 0) {
                return res.status(400).json({ message: 'La TVA doit être un pourcentage positif valide' });
            }
        }

        // Handle image URL (supports diskStorage or memoryStorage fallback)
        let imageUrl = null;
        if (req.file) {
            if (req.file.filename) {
                imageUrl = `/uploads/${req.file.filename}`;
            } else if (req.file.buffer) {
                // If using memoryStorage on Vercel, we can't save to disk easily without cloud storage.
                // We'll use a placeholder or log notice for now.
                console.log('Image received in memory, but disk persistence is limited on Vercel.');
                imageUrl = null; // Ideally upload to Cloudinary/S3 here
            }
        }

        const product = await prisma.product.create({
            data: {
                barcode: cleanBarcode,
                name: name || 'Produit sans nom',
                price: parseFloat(price || 0),
                purchasePrice: purchasePrice !== undefined && purchasePrice !== '' ? parseFloat(purchasePrice) : 0,
                stockQuantity: parseInt(stockQuantity || 0),
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
        console.error('Create Product Error:', error);
        res.status(500).json({ message: 'Erreur lors de la création du produit', error: error.message });
    }
};

// Get All Products
exports.getAllProducts = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: { status: 'Active', isDeleted: false },
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
        const product = await prisma.product.findFirst({
            where: { barcode: req.params.barcode, isDeleted: false },
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

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const productId = parseInt(id);

        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // 1. Remove from all active carts
        await prisma.cartItem.deleteMany({ where: { productId } });

        // 2. Soft delete: Keep sale history intact, just mark as deleted and change barcode to free it up
        await prisma.product.update({
            where: { id: productId },
            data: {
                isDeleted: true,
                status: 'Deleted',
                barcode: `${product.barcode}-deleted-${Date.now()}`
            }
        });

        res.json({ message: 'Product deleted' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(500).json({ message: 'Error deleting product', error: error.message });
    }
};