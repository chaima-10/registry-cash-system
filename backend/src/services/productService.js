const productRepository = require('../repositories/productRepository');
const uploadService = require('./uploadService');

class ProductService {
    async createProduct(data, file) {
        const { barcode, name, price, purchasePrice, stockQuantity, categoryId, subcategoryId, remise, tva, safetyStock } = data;

        console.log('Creating product with barcode:', barcode);

        if (!barcode || typeof barcode !== 'string' || !/^\d{12,13}$/.test(barcode.trim())) {
            throw new Error('Le code-barres est obligatoire et doit être au format EAN-13 (13 chiffres) ou UPC-A (12 chiffres)');
        }

        const cleanBarcode = barcode.trim();

        const existing = await productRepository.findProductByBarcode(cleanBarcode);
        if (existing) {
            throw new Error('Un produit avec ce code-barres existe déjà');
        }

        let validRemise = 0;
        if (remise !== undefined && remise !== null && remise !== '') {
            validRemise = parseFloat(remise);
            if (isNaN(validRemise) || validRemise < 0 || validRemise > 100) {
                throw new Error('La remise doit être un pourcentage entre 0 et 100');
            }
        }

        let validTva = 0;
        if (tva !== undefined && tva !== null && tva !== '') {
            validTva = parseFloat(tva);
            if (isNaN(validTva) || validTva < 0) {
                throw new Error('La TVA doit être un pourcentage positif valide');
            }
        }

        let imageUrl = null;
        if (file) {
            imageUrl = await uploadService.uploadImage(file, 'products');
        }

        const safetyStockVal = safetyStock !== undefined ? parseInt(safetyStock) : 0;
        const productData = {
            barcode: cleanBarcode,
            name: name || 'Produit sans nom',
            price: parseFloat(price || 0).toString(),
            purchasePrice: (purchasePrice !== undefined && purchasePrice !== '') ? parseFloat(purchasePrice).toString() : "0.0000",
            stockQuantity: parseInt(stockQuantity || 0),
            categoryId: categoryId ? parseInt(categoryId) : null,
            subcategoryId: subcategoryId ? parseInt(subcategoryId) : null,
            remise: validRemise.toString(),
            tva: validTva.toString(),
            imageUrl: imageUrl,
            safetyStock: safetyStockVal,
        };

        if (safetyStockVal > 0) {
            productData.reorderLevel = safetyStockVal.toString();
        }

        const product = await productRepository.createProduct(productData);

        if (safetyStockVal === 0) {
            const stockService = require('./stockService');
            stockService.updateProductReorderLevel(product.id).catch(console.error);
        }

        return product;
    }

    async getAllProducts() {
        return await productRepository.getAllProducts();
    }

    async getProductByBarcode(barcode) {
        const product = await productRepository.findProductByBarcode(barcode);
        if (!product) {
            throw new Error('Product not found');
        }
        return product;
    }

    async updateProduct(id, data, file) {
        const { name, price, purchasePrice, stockQuantity, categoryId, subcategoryId, remise, tva, barcode, safetyStock } = data;

        let updateData = {
            name,
            price: price !== undefined ? parseFloat(price) : undefined,
            purchasePrice: purchasePrice !== undefined && purchasePrice !== '' ? parseFloat(purchasePrice) : undefined,
            stockQuantity: stockQuantity !== undefined ? parseInt(stockQuantity) : undefined,
            safetyStock: safetyStock !== undefined ? parseInt(safetyStock) : undefined,
        };

        if (updateData.safetyStock !== undefined && updateData.safetyStock > 0) {
            updateData.reorderLevel = updateData.safetyStock.toString();
        }

        if (barcode !== undefined && barcode !== null && barcode !== '') {
            const cleanBarcode = barcode.trim();
            if (!/^\d{12,13}$/.test(cleanBarcode)) {
                throw new Error('Barcode must be strictly EAN-13 (13 digits) or UPC-A (12 digits)');
            }
            const conflict = await productRepository.findConflictingProductByBarcode(cleanBarcode, id);
            if (conflict) {
                throw new Error('A product with this barcode already exists');
            }
            updateData.barcode = cleanBarcode;
        }

        if ('categoryId' in data) {
            updateData.categoryId = categoryId ? parseInt(categoryId) : null;
        }
        if ('subcategoryId' in data) {
            updateData.subcategoryId = subcategoryId ? parseInt(subcategoryId) : null;
        }

        if (remise !== undefined && remise !== null && remise !== '') {
            let validRemise = parseFloat(remise);
            if (isNaN(validRemise) || validRemise < 0 || validRemise > 100) {
                throw new Error('Remise must be a percentage between 0 and 100');
            }
            updateData.remise = validRemise.toString();
        }

        if (tva !== undefined && tva !== null && tva !== '') {
            let validTva = parseFloat(tva);
            if (isNaN(validTva) || validTva < 0) {
                throw new Error('TVA must be a valid positive percentage');
            }
            updateData.tva = validTva.toString();
        }

        if (file) {
            updateData.imageUrl = await uploadService.uploadImage(file, 'products');
        }

        // Convert price fields to strings if they are present
        if (updateData.price !== undefined) updateData.price = updateData.price.toString();
        if (updateData.purchasePrice !== undefined) updateData.purchasePrice = updateData.purchasePrice.toString();

        const updatedProduct = await productRepository.updateProduct(id, updateData);

        if ((updateData.safetyStock === undefined || updateData.safetyStock === 0) && (stockQuantity !== undefined || safetyStock !== undefined)) {
            // Only recalculate if safetyStock is 0 or not set
            const stockService = require('./stockService');
            stockService.updateProductReorderLevel(id).catch(console.error);
        }

        return updatedProduct;
    }

    async deleteProduct(id) {
        const product = await productRepository.getProductById(id);
        if (!product) {
            throw new Error('Product not found');
        }

        await productRepository.deleteProductAssociations(id);
        
        const deletedBarcode = `${product.barcode}-deleted-${Date.now()}`;
        await productRepository.softDeleteProduct(id, deletedBarcode);
    }
}

module.exports = new ProductService();
