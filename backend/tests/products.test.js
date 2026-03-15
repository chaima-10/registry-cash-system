const Joi = require('joi');

/**
 * Inline product schema for unit testing.
 * This mirrors the expected shape of a product creation request body.
 */
const productSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    barcode: Joi.string().min(3).max(50).required(),
    price: Joi.number().positive().required(),
    quantity: Joi.number().integer().min(0).required(),
    categoryId: Joi.number().integer().optional(),
    subcategoryId: Joi.number().integer().optional(),
    remise: Joi.number().min(0).max(100).optional(),
});

describe('Product Data Validation', () => {

    test('passes with valid product data', () => {
        const { error } = productSchema.validate({
            name: 'Laptop',
            barcode: 'LAP-001',
            price: 999.99,
            quantity: 10
        });
        expect(error).toBeUndefined();
    });

    test('passes with full optional fields', () => {
        const { error } = productSchema.validate({
            name: 'Phone',
            barcode: 'PHN-002',
            price: 499,
            quantity: 20,
            categoryId: 1,
            subcategoryId: 3,
            remise: 10
        });
        expect(error).toBeUndefined();
    });

    test('fails when name is missing', () => {
        const { error } = productSchema.validate({ barcode: 'LAP-001', price: 100, quantity: 5 });
        expect(error).toBeDefined();
        expect(error.message).toMatch(/name/i);
    });

    test('fails when barcode is missing', () => {
        const { error } = productSchema.validate({ name: 'Laptop', price: 100, quantity: 5 });
        expect(error).toBeDefined();
        expect(error.message).toMatch(/barcode/i);
    });

    test('fails when price is zero or negative', () => {
        const { error } = productSchema.validate({ name: 'Laptop', barcode: 'LAP-001', price: 0, quantity: 5 });
        expect(error).toBeDefined();
        expect(error.message).toMatch(/price/i);
    });

    test('fails when price is non-numeric', () => {
        const { error } = productSchema.validate({ name: 'Laptop', barcode: 'LAP-001', price: 'free', quantity: 5 });
        expect(error).toBeDefined();
    });

    test('fails when quantity is negative', () => {
        const { error } = productSchema.validate({ name: 'Laptop', barcode: 'LAP-001', price: 100, quantity: -3 });
        expect(error).toBeDefined();
        expect(error.message).toMatch(/quantity/i);
    });

    test('fails when remise exceeds 100', () => {
        const { error } = productSchema.validate({ name: 'Laptop', barcode: 'LAP-001', price: 100, quantity: 5, remise: 150 });
        expect(error).toBeDefined();
        expect(error.message).toMatch(/remise/i);
    });

});
