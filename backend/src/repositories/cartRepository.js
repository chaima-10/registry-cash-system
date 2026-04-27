const prisma = require('../config/prisma');

class CartRepository {
    async getCartByUserId(userId) {
        return await prisma.cart.findFirst({
            where: { userId },
            include: {
                items: { include: { product: true } }
            },
        });
    }

    async createCart(userId) {
        return await prisma.cart.create({
            data: { userId },
            include: { items: { include: { product: true } } }
        });
    }

    async getProductById(productId) {
        return await prisma.product.findUnique({ where: { id: productId } });
    }

    async getCartItemById(itemId) {
        return await prisma.cartitem.findUnique({
            where: { id: itemId },
            include: { product: true, cart: { include: { items: true } } }
        });
    }

    async updateCartTransaction(queries) {
        return await prisma.$transaction(queries);
    }

    async clearCartTransaction(cartId) {
        return await prisma.$transaction([
            prisma.cartitem.deleteMany({ where: { cartId } }),
            prisma.cart.update({ where: { id: cartId }, data: { subtotalHT: "0", tvaAmount: "0", totalAmount: "0" } })
        ]);
    }

    // Export Prisma object for transaction queries building in service
    getPrisma() {
        return prisma;
    }
}

module.exports = new CartRepository();
