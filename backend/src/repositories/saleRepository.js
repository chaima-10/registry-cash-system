const prisma = require('../config/prisma');

class SaleRepository {
    async createSaleTransaction(userId, paymentMethod, currency, exchangeRate, amountTendered, changeAmount) {
        return await prisma.$transaction(async (tx) => {
            // 1. Get current cart
            const cart = await tx.cart.findFirst({
                where: { userId },
                include: {
                    items: {
                        include: { product: true }
                    }
                }
            });

            if (!cart || cart.items.length === 0) {
                throw new Error('Cart is empty');
            }

            // 2. Verify stock availability
            for (const item of cart.items) {
                if (item.product.stockQuantity < item.quantity) {
                    throw new Error(`Insufficient stock for ${item.product.name}`);
                }
            }

            // 3. Create Sale record
            const sale = await tx.sale.create({
                data: {
                    userId: parseInt(userId),
                    totalAmount: cart.totalAmount.toString(),
                    subtotalHT: cart.subtotalHT.toString(),
                    tvaAmount: cart.tvaAmount.toString(),
                    currency: currency || 'USD',
                    exchangeRate: exchangeRate ? parseFloat(exchangeRate).toString() : "1.0000",
                    paymentMethod: paymentMethod,
                    amountTendered: amountTendered ? parseFloat(amountTendered).toString() : null,
                    changeAmount: changeAmount ? parseFloat(changeAmount).toString() : null
                }
            });

            // 4. Create saleitem and Decrement Stock
            for (const item of cart.items) {
                const productPrice = parseFloat(item.product.price);
                const remise = parseFloat(item.product.remise || 0);
                const tvaRate = parseFloat(item.tvaRate || 0);
                const discountedPrice = productPrice * (1 - remise / 100);
                const priceTTC = discountedPrice * (1 + tvaRate / 100);

                await tx.saleitem.create({
                    data: {
                        saleId: sale.id,
                        productId: item.productId,
                        quantity: parseInt(item.quantity),
                        price: discountedPrice.toString(),
                        tvaRate: item.tvaRate.toString(),
                        tvaAmount: item.tvaAmount.toString(),
                        priceTTC: priceTTC.toString(),
                        subtotal: item.subtotal.toString()
                    }
                });

                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stockQuantity: {
                            decrement: parseInt(item.quantity)
                        }
                    }
                });
            }

            // 5. Clear cart
            await tx.cartitem.deleteMany({ where: { cartId: cart.id } });
            await tx.cart.update({
                where: { id: cart.id },
                data: { totalAmount: 0, subtotalHT: 0, tvaAmount: 0 }
            });

            // Return sale with items
            return await tx.sale.findUnique({
                where: { id: sale.id },
                include: {
                    items: {
                        include: { product: true }
                    },
                    user: {
                        select: {
                            id: true,
                            username: true,
                            role: true
                        }
                    }
                }
            });
        }, {
            maxWait: 5000,
            timeout: 15000
        });
    }

    async getAllSales() {
        return await prisma.sale.findMany({
            include: {
                items: {
                    include: { product: true }
                },
                user: {
                    select: {
                        id: true,
                        username: true,
                        role: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getSaleById(id) {
        return await prisma.sale.findUnique({
            where: { id },
            include: {
                items: {
                    include: { product: true }
                },
                user: {
                    select: {
                        id: true,
                        username: true,
                        role: true
                    }
                }
            }
        });
    }
}

module.exports = new SaleRepository();
