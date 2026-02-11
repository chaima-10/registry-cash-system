const prisma = require('../config/prisma');

// Helper: Calculate total amount for a cart
const calculateTotal = async (cartId) => {
    const cartItems = await prisma.cartItem.findMany({
        where: { cartId },
    });
    const total = cartItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);

    await prisma.cart.update({
        where: { id: cartId },
        data: { totalAmount: total },
    });
    return total;
};

// Get the active cart for the logged-in user (Cashier)
exports.getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        let cart = await prisma.cart.findFirst({
            where: { userId },
            include: {
                items: { include: { product: true } }
            },
        });

        if (!cart) {
            cart = await prisma.cart.create({
                data: { userId },
                include: { items: true }
            });
        }

        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cart', error: error.message });
    }
};

// Add item to cart
exports.addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, quantity } = req.body; // quantity to add

        if (!productId || !quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Invalid product or quantity' });
        }

        // Get Product
        const product = await prisma.product.findUnique({ where: { id: parseInt(productId) } });
        if (!product) return res.status(404).json({ message: 'Product not found' });

        // Get or Create Cart
        let cart = await prisma.cart.findFirst({ where: { userId } });
        if (!cart) {
            cart = await prisma.cart.create({ data: { userId } });
        }

        // Check if item exists in cart
        const existingItem = await prisma.cartItem.findFirst({
            where: { cartId: cart.id, productId: parseInt(productId) }
        });

        let newQuantity = parseInt(quantity);
        if (existingItem) {
            newQuantity += existingItem.quantity;
        }

        // Validating Stock
        if (product.stockQuantity < newQuantity) {
            return res.status(400).json({ message: `Insufficient stock. Available: ${product.stockQuantity}` });
        }

        // Upsert Item
        if (existingItem) {
            await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: {
                    quantity: newQuantity,
                    subtotal: newQuantity * parseFloat(product.price)
                }
            });
        } else {
            await prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId: parseInt(productId),
                    quantity: newQuantity,
                    subtotal: newQuantity * parseFloat(product.price)
                }
            });
        }

        // Recalculate Total
        await calculateTotal(cart.id);

        // Return updated cart
        const updatedCart = await prisma.cart.findUnique({
            where: { id: cart.id },
            include: { items: { include: { product: true } } }
        });
        res.json(updatedCart);

    } catch (error) {
        res.status(500).json({ message: 'Error adding to cart', error: error.message });
    }
};

// Update item quantity directly
exports.updateCartItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;

        if (quantity < 0) return res.status(400).json({ message: 'Invalid quantity' });

        const item = await prisma.cartItem.findUnique({
            where: { id: parseInt(itemId) },
            include: { product: true }
        });

        if (!item) return res.status(404).json({ message: 'Cart item not found' });

        // Check Stock
        if (item.product.stockQuantity < quantity) {
            return res.status(400).json({ message: `Insufficient stock. Available: ${item.product.stockQuantity}` });
        }

        if (quantity === 0) {
            await prisma.cartItem.delete({ where: { id: parseInt(itemId) } });
        } else {
            await prisma.cartItem.update({
                where: { id: parseInt(itemId) },
                data: {
                    quantity: parseInt(quantity),
                    subtotal: parseInt(quantity) * parseFloat(item.product.price)
                }
            });
        }

        await calculateTotal(item.cartId);

        // Return updated cart
        const updatedCart = await prisma.cart.findUnique({
            where: { id: item.cartId },
            include: { items: { include: { product: true } } }
        });
        res.json(updatedCart);

    } catch (error) {
        res.status(500).json({ message: 'Error updating cart item', error: error.message });
    }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
    try {
        const { itemId } = req.params;
        const item = await prisma.cartItem.findUnique({ where: { id: parseInt(itemId) } });

        if (!item) return res.status(404).json({ message: 'Item not found' });

        await prisma.cartItem.delete({ where: { id: parseInt(itemId) } });
        await calculateTotal(item.cartId);

        const updatedCart = await prisma.cart.findUnique({
            where: { id: item.cartId },
            include: { items: { include: { product: true } } }
        });
        res.json(updatedCart);

    } catch (error) {
        res.status(500).json({ message: 'Error removing item', error: error.message });
    }
};

// Clear Cart
exports.clearCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await prisma.cart.findFirst({ where: { userId } });

        if (cart) {
            await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
            await prisma.cart.update({ where: { id: cart.id }, data: { totalAmount: 0 } });
        }

        res.json({ message: 'Cart cleared', totalAmount: 0, items: [] });
    } catch (error) {
        res.status(500).json({ message: 'Error clearing cart', error: error.message });
    }
};
