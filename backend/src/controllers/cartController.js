const cartService = require('../services/cartService');

// Get the active cart for the logged-in user (Cashier)
exports.getCart = async (req, res) => {
    try {
        const cart = await cartService.getCart(req.user.id);
        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cart', error: error.message });
    }
};

// Add item to cart
exports.addToCart = async (req, res) => {
    try {
        const updatedCart = await cartService.addToCart(req.user.id, req.body.productId, req.body.quantity);
        res.json(updatedCart);
    } catch (error) {
        const status = ['Invalid product or quantity', 'Insufficient stock'].some(msg => error.message.includes(msg)) ? 400 : 
                       error.message === 'Product not found' ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};

// Update item quantity directly
exports.updateCartItem = async (req, res) => {
    try {
        const updatedCart = await cartService.updateCartItem(req.params.itemId, req.body.quantity);
        res.json(updatedCart);
    } catch (error) {
        const status = ['Invalid quantity', 'Insufficient stock'].some(msg => error.message.includes(msg)) ? 400 : 
                       error.message === 'Cart item not found' ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
    try {
        const updatedCart = await cartService.removeFromCart(req.params.itemId);
        res.json(updatedCart);
    } catch (error) {
        const status = error.message === 'Item not found' ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};

// Clear Cart
exports.clearCart = async (req, res) => {
    try {
        const result = await cartService.clearCart(req.user.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error clearing cart', error: error.message });
    }
};
