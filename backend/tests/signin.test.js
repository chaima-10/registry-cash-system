const { loginSchema } = require('../src/validators/authValidators');

describe('Sign In Validation', () => {

    test('passes with valid username and password', () => {
        const { error } = loginSchema.validate({ username: 'admin', password: 'secret123' });
        expect(error).toBeUndefined();
    });

    test('passes with valid email and password', () => {
        const { error } = loginSchema.validate({ email: 'user@example.com', password: 'mypassword' });
        expect(error).toBeUndefined();
    });

    test('fails when both username and email are missing', () => {
        const { error } = loginSchema.validate({ password: 'mypassword' });
        expect(error).toBeDefined();
        expect(error.message).toMatch(/username|email/i);
    });

    test('fails when password is missing', () => {
        const { error } = loginSchema.validate({ username: 'admin' });
        expect(error).toBeDefined();
        expect(error.message).toMatch(/password/i);
    });

    test('fails when password is empty string', () => {
        const { error } = loginSchema.validate({ username: 'admin', password: '' });
        expect(error).toBeDefined();
    });

    test('fails with invalid email format', () => {
        const { error } = loginSchema.validate({ email: 'not-an-email', password: 'secret' });
        expect(error).toBeDefined();
    });

    test('fails when all fields are missing', () => {
        const { error } = loginSchema.validate({});
        expect(error).toBeDefined();
    });

});
