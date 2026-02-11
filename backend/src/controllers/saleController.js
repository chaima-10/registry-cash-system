const prisma = require('../config/prisma');

// Process Checkout & Create Sale
exports.createSale = async (req, res) => {
    try {
        const userId = req.user.id;
        const { paymentMethod } = req.body; // CASH, CARD, VOUCHER

        if (!['CASH', 'CARD', 'VOUCHER'].includes(paymentMethod)) {
            return res.status(400).json({ message: 'Invalid payment method' });
        }

        // Start Transaction
        const result = await prisma.$transaction(async (tx) => {
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

            // 2. Verify stock availability (again, for concurrency)
            for (const item of cart.items) {
                if (item.product.stockQuantity < item.quantity) {
                    throw new Error(`Insufficient stock for ${item.product.name}`);
                }
            }

            // 3. Create Sale record
            const sale = await tx.sale.create({
                data: {
                    userId,
                    totalAmount: cart.totalAmount,
                    paymentMethod
                }
            });

            // 4. Create SaleItems and Decrement Stock
            for (const item of cart.items) {
                // Create sale item
                await tx.saleItem.create({
                    data: {
                        saleId: sale.id,
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.product.price,
                        subtotal: item.subtotal
                    }
                });

                // Decrement stock
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stockQuantity: {
                            decrement: item.quantity
                        }
                    }
                });
            }

            // 5. Clear cart
            await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
            await tx.cart.update({
                where: { id: cart.id },
                data: { totalAmount: 0 }
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
        });

        res.status(201).json({
            message: 'Sale completed successfully',
            sale: result
        });

    } catch (error) {
        console.error('Sale creation error:', error);
        res.status(500).json({
            message: error.message || 'Error processing sale',
            error: error.message
        });
    }
};

// Get all sales (Admin)
exports.getAllSales = async (req, res) => {
    try {
        const sales = await prisma.sale.findMany({
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

        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sales', error: error.message });
    }
};

// Get sale by ID
exports.getSaleById = async (req, res) => {
    try {
        const { id } = req.params;
        const sale = await prisma.sale.findUnique({
            where: { id: parseInt(id) },
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

        if (!sale) return res.status(404).json({ message: 'Sale not found' });

        res.json(sale);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sale', error: error.message });
    }
};
