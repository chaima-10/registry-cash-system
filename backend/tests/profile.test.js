const { updateProfileSchema, changePasswordSchema } = require('../src/validators/authValidators');

describe('Profile Update Validation', () => {

    test('passes with valid email and phone', () => {
        const { error } = updateProfileSchema.validate({ email: 'user@example.com', phone: '0612345678' });
        expect(error).toBeUndefined();
    });

    test('passes with all optional fields included', () => {
        const { error } = updateProfileSchema.validate({
            fullName: 'Chaima Ben Ali',
            email: 'chaima@mail.com',
            phone: '21345678',
            username: 'chaima10',
            theme: 'dark'
        });
        expect(error).toBeUndefined();
    });

    test('fails when email is missing', () => {
        const { error } = updateProfileSchema.validate({ phone: '0612345678' });
        expect(error).toBeDefined();
        expect(error.message).toMatch(/email/i);
    });

    test('fails with invalid email format', () => {
        const { error } = updateProfileSchema.validate({ email: 'bad-email', phone: '0612345678' });
        expect(error).toBeDefined();
        expect(error.message).toMatch(/email/i);
    });

    test('passes when phone is missing', () => {
        const { error } = updateProfileSchema.validate({ email: 'user@example.com' });
        expect(error).toBeUndefined();
    });

    test('fails when phone contains letters', () => {
        const { error } = updateProfileSchema.validate({ email: 'user@example.com', phone: 'abc1234' });
        expect(error).toBeDefined();
    });

    test('fails when phone is too short (less than 8 digits)', () => {
        const { error } = updateProfileSchema.validate({ email: 'user@example.com', phone: '123' });
        expect(error).toBeDefined();
    });

    test('fails when phone is too long (more than 15 digits)', () => {
        const { error } = updateProfileSchema.validate({ email: 'user@example.com', phone: '1234567890123456' });
        expect(error).toBeDefined();
    });

});

describe('Change Password Validation', () => {

    test('passes with valid currentPassword and newPassword', () => {
        const { error } = changePasswordSchema.validate({ currentPassword: 'oldPass', newPassword: 'newPass123' });
        expect(error).toBeUndefined();
    });

    test('fails when currentPassword is missing', () => {
        const { error } = changePasswordSchema.validate({ newPassword: 'newPass123' });
        expect(error).toBeDefined();
        expect(error.message).toMatch(/current password/i);
    });

    test('fails when newPassword is too short', () => {
        const { error } = changePasswordSchema.validate({ currentPassword: 'oldPass', newPassword: '123' });
        expect(error).toBeDefined();
        expect(error.message).toMatch(/6 characters/i);
    });

    test('fails when both fields are missing', () => {
        const { error } = changePasswordSchema.validate({});
        expect(error).toBeDefined();
    });

});
