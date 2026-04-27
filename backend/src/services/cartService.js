const cartRepository = require('../repositories/cartRepository');
const prisma = cartRepository.getPrisma();

class CartService {
    async getCart(userId) {
        let cart = await cartRepository.getCartByUserId(userId);
        if (!cart) {
            cart = await cartRepository.createCart(userId);
        }
        return cart;
    }

    async addToCart(userId, productId, quantity) {
        if (!productId || !quantity || quantity <= 0) {
            throw new Error('Invalid product or quantity');
        }

        let [product, cart] = await Promise.all([
            cartRepository.getProductById(parseInt(productId)),
            cartRepository.getCartByUserId(userId)
        ]);

        if (!product) throw new Error('Product not found');

        if (!cart) {
            cart = await cartRepository.createCart(userId);
        }

        const existingItemIndex = cart.items.findIndex(item => item.productId === parseInt(productId));
        let newQuantity = parseInt(quantity);
        if (existingItemIndex !== -1) {
            newQuantity += cart.items[existingItemIndex].quantity;
        }

        if (product.stockQuantity < newQuantity) {
            throw new Error(`Insufficient stock. Available: ${product.stockQuantity}`);
        }

        const price = parseFloat(product.price);
        const remise = parseFloat(product.remise || 0);
        const tvaRate = parseFloat(product.tva || 0);
        const discountedPrice = price * (1 - remise / 100);
        const priceTTC = discountedPrice * (1 + tvaRate / 100);
        const newSubtotalHT = newQuantity * discountedPrice;
        const newTvaAmount = newSubtotalHT * (tvaRate / 100);

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
            queries.push(prisma.cartitem.update({
                where: { id: cart.items[existingItemIndex].id },
                data: { 
                    quantity: newQuantity, 
                    subtotal: newSubtotalHT.toString(), 
                    tvaRate: tvaRate.toString(), 
                    tvaAmount: newTvaAmount.toString(), 
                    priceTTC: priceTTC.toString() 
                }
            }));
        } else {
            queries.push(prisma.cartitem.create({
                data: {
                    cartId: cart.id,
                    productId: parseInt(productId),
                    quantity: newQuantity,
                    subtotal: newSubtotalHT.toString(),
                    tvaRate: tvaRate.toString(),
                    tvaAmount: newTvaAmount.toString(),
                    priceTTC: priceTTC.toString()
                }
            }));
        }

        queries.push(prisma.cart.update({
            where: { id: cart.id },
            data: { 
                subtotalHT: cartSubtotalHT.toString(), 
                tvaAmount: cartTvaAmount.toString(), 
                totalAmount: cartTotalAmount.toString() 
            },
            include: { items: { include: { product: true } } }
        }));

        const results = await cartRepository.updateCartTransaction(queries);
        return results[results.length - 1];
    }

    async updateCartItem(itemId, quantity) {
        if (quantity < 0) throw new Error('Invalid quantity');

        const item = await cartRepository.getCartItemById(parseInt(itemId));
        if (!item) throw new Error('Cart item not found');

        if (item.product.stockQuantity < quantity) {
            throw new Error(`Insufficient stock. Available: ${item.product.stockQuantity}`);
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
            queries.push(prisma.cartitem.delete({ where: { id: parseInt(itemId) } }));
        } else {
            queries.push(prisma.cartitem.update({
                where: { id: parseInt(itemId) },
                data: { 
                    quantity: parseInt(quantity), 
                    subtotal: newSubtotalHT.toString(), 
                    tvaRate: tvaRate.toString(), 
                    tvaAmount: newTvaAmount.toString(), 
                    priceTTC: priceTTC.toString() 
                }
            }));
        }

        queries.push(prisma.cart.update({
            where: { id: cart.id },
            data: { 
                subtotalHT: cartSubtotalHT.toString(), 
                tvaAmount: cartTvaAmount.toString(), 
                totalAmount: cartTotalAmount.toString() 
            },
            include: { items: { include: { product: true } } }
        }));

        const results = await cartRepository.updateCartTransaction(queries);
        return results[results.length - 1];
    }

    async removeFromCart(itemId) {
        const item = await cartRepository.getCartItemById(parseInt(itemId));
        if (!item) throw new Error('Item not found');

        const cart = item.cart;
        const itemIndex = cart.items.findIndex(ci => ci.id === parseInt(itemId));
        cart.items.splice(itemIndex, 1);

        const cartSubtotalHT = cart.items.reduce((sum, ci) => sum + parseFloat(ci.subtotal || 0), 0);
        const cartTvaAmount = cart.items.reduce((sum, ci) => sum + parseFloat(ci.tvaAmount || 0), 0);
        const cartTotalAmount = cartSubtotalHT + cartTvaAmount;

        const queries = [
            prisma.cartitem.delete({ where: { id: parseInt(itemId) } }),
            prisma.cart.update({
                where: { id: cart.id },
                data: { 
                    subtotalHT: cartSubtotalHT.toString(), 
                    tvaAmount: cartTvaAmount.toString(), 
                    totalAmount: cartTotalAmount.toString() 
                },
                include: { items: { include: { product: true } } }
            })
        ];

        const results = await cartRepository.updateCartTransaction(queries);
        return results[results.length - 1];
    }

    async clearCart(userId) {
        const cart = await cartRepository.getCartByUserId(userId);
        if (cart) {
            await cartRepository.clearCartTransaction(cart.id);
        }
        return { message: 'Cart cleared', subtotalHT: 0, tvaAmount: 0, totalAmount: 0, items: [] };
    }
}

module.exports = new CartService();
