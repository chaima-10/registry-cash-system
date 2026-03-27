const prisma = require('../config/prisma');

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
                include: { items: { include: { product: true } } }
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
        const { productId, quantity } = req.body;

        if (!productId || !quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Invalid product or quantity' });
        }

        // Parallel fetch Product and Cart to save latency
        let [product, cart] = await Promise.all([
            prisma.product.findUnique({ where: { id: parseInt(productId) } }),
            prisma.cart.findFirst({
                where: { userId },
                include: { items: true }
            })
        ]);

        if (!product) return res.status(404).json({ message: 'Product not found' });

        if (!cart) {
            cart = await prisma.cart.create({
                data: { userId },
                include: { items: true }
            });
        }

        const existingItemIndex = cart.items.findIndex(item => item.productId === parseInt(productId));
        let newQuantity = parseInt(quantity);
        if (existingItemIndex !== -1) {
            newQuantity += cart.items[existingItemIndex].quantity;
        }

        if (product.stockQuantity < newQuantity) {
            return res.status(400).json({ message: `Insufficient stock. Available: ${product.stockQuantity}` });
        }

        const price = parseFloat(product.price);
        const remise = parseFloat(product.remise || 0);
        const tvaRate = parseFloat(product.tva || 0);
        const discountedPrice = price * (1 - remise / 100);
        const priceTTC = discountedPrice * (1 + tvaRate / 100);
        const newSubtotalHT = newQuantity * discountedPrice;
        const newTvaAmount = newSubtotalHT * (tvaRate / 100);

        // Calculate totals in memory
        const inMemoryItem = { ...cart.items[existingItemIndex], quantity: newQuantity, subtotal: newSubtotalHT, tvaRate, tvaAmount: newTvaAmount, priceTTC };
        if (existingItemIndex !== -1) {
            cart.items[existingItemIndex] = inMemoryItem;
        } else {
            cart.items.push(inMemoryItem);
        }

        const cartSubtotalHT = cart.items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
        const cartTvaAmount = cart.items.reduce((sum, item) => sum + parseFloat(item.tvaAmount || 0), 0);
        const cartTotalAmount = cartSubtotalHT + cartTvaAmount;

        const queries = [];

        if (existingItemIndex !== -1) {
            queries.push(prisma.cartItem.update({
                where: { id: cart.items[existingItemIndex].id },
                data: { quantity: newQuantity, subtotal: newSubtotalHT, tvaRate, tvaAmount: newTvaAmount, priceTTC }
            }));
        } else {
            queries.push(prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId: parseInt(productId),
                    quantity: newQuantity,
                    subtotal: newSubtotalHT,
                    tvaRate,
                    tvaAmount: newTvaAmount,
                    priceTTC
                }
            }));
        }

        queries.push(prisma.cart.update({
            where: { id: cart.id },
            data: { subtotalHT: cartSubtotalHT, tvaAmount: cartTvaAmount, totalAmount: cartTotalAmount },
            include: { items: { include: { product: true } } }
        }));

        // Execute all writes in a single transaction roundtrip
        const results = await prisma.$transaction(queries);
        const updatedCart = results[results.length - 1]; // cart.update is the last response

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
            include: { product: true, cart: { include: { items: true } } }
        });

        if (!item) return res.status(404).json({ message: 'Cart item not found' });

        if (item.product.stockQuantity < quantity) {
            return res.status(400).json({ message: `Insufficient stock. Available: ${item.product.stockQuantity}` });
        }

        const cart = item.cart;
        const price = parseFloat(item.product.price);
        const remise = parseFloat(item.product.remise || 0);
        const tvaRate = parseFloat(item.product.tva || 0);
        const discountedPrice = price * (1 - remise / 100);
        const priceTTC = discountedPrice * (1 + tvaRate / 100);
        const newSubtotalHT = parseInt(quantity) * discountedPrice;
        const newTvaAmount = newSubtotalHT * (tvaRate / 100);

        const itemIndex = cart.items.findIndex(ci => ci.id === parseInt(itemId));
        if (quantity === 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex] = { ...cart.items[itemIndex], quantity: parseInt(quantity), subtotal: newSubtotalHT, tvaRate, tvaAmount: newTvaAmount, priceTTC };
        }

        const cartSubtotalHT = cart.items.reduce((sum, ci) => sum + parseFloat(ci.subtotal || 0), 0);
        const cartTvaAmount = cart.items.reduce((sum, ci) => sum + parseFloat(ci.tvaAmount || 0), 0);
        const cartTotalAmount = cartSubtotalHT + cartTvaAmount;

        const queries = [];

        if (quantity === 0) {
            queries.push(prisma.cartItem.delete({ where: { id: parseInt(itemId) } }));
        } else {
            queries.push(prisma.cartItem.update({
                where: { id: parseInt(itemId) },
                data: { quantity: parseInt(quantity), subtotal: newSubtotalHT, tvaRate, tvaAmount: newTvaAmount, priceTTC }
            }));
        }

        queries.push(prisma.cart.update({
            where: { id: cart.id },
            data: { subtotalHT: cartSubtotalHT, tvaAmount: cartTvaAmount, totalAmount: cartTotalAmount },
            include: { items: { include: { product: true } } }
        }));

        const results = await prisma.$transaction(queries);
        const updatedCart = results[results.length - 1];

        res.json(updatedCart);
    } catch (error) {
        res.status(500).json({ message: 'Error updating cart item', error: error.message });
    }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
    try {
        const { itemId } = req.params;
        const item = await prisma.cartItem.findUnique({
            where: { id: parseInt(itemId) },
            include: { cart: { include: { items: true } } }
        });

        if (!item) return res.status(404).json({ message: 'Item not found' });

        const cart = item.cart;
        const itemIndex = cart.items.findIndex(ci => ci.id === parseInt(itemId));
        cart.items.splice(itemIndex, 1);

        const cartSubtotalHT = cart.items.reduce((sum, ci) => sum + parseFloat(ci.subtotal || 0), 0);
        const cartTvaAmount = cart.items.reduce((sum, ci) => sum + parseFloat(ci.tvaAmount || 0), 0);
        const cartTotalAmount = cartSubtotalHT + cartTvaAmount;

        const queries = [
            prisma.cartItem.delete({ where: { id: parseInt(itemId) } }),
            prisma.cart.update({
                where: { id: cart.id },
                data: { subtotalHT: cartSubtotalHT, tvaAmount: cartTvaAmount, totalAmount: cartTotalAmount },
                include: { items: { include: { product: true } } }
            })
        ];

        const results = await prisma.$transaction(queries);
        const updatedCart = results[results.length - 1];

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
            await prisma.$transaction([
                prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
                prisma.cart.update({ where: { id: cart.id }, data: { subtotalHT: 0, tvaAmount: 0, totalAmount: 0 } })
            ]);
        }

        res.json({ message: 'Cart cleared', subtotalHT: 0, tvaAmount: 0, totalAmount: 0, items: [] });
    } catch (error) {
        res.status(500).json({ message: 'Error clearing cart', error: error.message });
    }
};
