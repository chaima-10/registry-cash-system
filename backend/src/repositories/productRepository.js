const prisma = require('../config/prisma');

class ProductRepository {
    async findProductByBarcode(barcode) {
        return await prisma.product.findFirst({ 
            where: { barcode, isDeleted: false },
            include: {
                category: true,
                subcategory: true,
            }
        });
    }

    async findConflictingProductByBarcode(barcode, excludeId) {
        return await prisma.product.findFirst({
            where: { barcode, isDeleted: false, NOT: { id: excludeId } }
        });
    }

    async createProduct(data) {
        return await prisma.product.create({
            data,
            include: {
                category: true,
                subcategory: true,
            }
        });
    }

    async getAllProducts() {
        return await prisma.product.findMany({
            where: { status: 'Active', isDeleted: false },
            include: {
                category: true,
                subcategory: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    async updateProduct(id, data) {
        return await prisma.product.update({
            where: { id },
            data,
            include: {
                category: true,
                subcategory: true,
            }
        });
    }

    async getProductById(id) {
        return await prisma.product.findUnique({ where: { id } });
    }

    async deleteProductAssociations(productId) {
        return await prisma.cartitem.deleteMany({ where: { productId } });
    }

    async softDeleteProduct(id, deletedBarcode) {
        return await prisma.product.update({
            where: { id },
            data: {
                isDeleted: true,
                status: 'Deleted',
                barcode: deletedBarcode
            }
        });
    }
}

module.exports = new ProductRepository();
