const Joi = require('joi');

/**
 * Schema for user login.
 * Allows login with EITHER username OR email, plus password.
 */
const loginSchema = Joi.object({
    // Allow either username OR email (at least one must be provided)
    username: Joi.string().min(3).max(50),
    email: Joi.string().email({ tlds: { allow: false } }),
    password: Joi.string().min(1).required().messages({
        'string.empty': 'Password is required.',
        'any.required': 'Password is required.',
    }),
}).or('username', 'email').messages({
    'object.missing': 'Please provide either a username or an email address to log in.',
});

/**
 * Schema for updating user profile.
 */
const updateProfileSchema = Joi.object({
    fullName: Joi.string().min(2).max(100).optional().allow('').messages({
        'string.min': 'Full name must be at least 2 characters.',
    }),
    email: Joi.string().email({ tlds: { allow: false } }).required().messages({
        'string.email': 'Please provide a valid email address (e.g. user@example.com).',
        'string.empty': 'Email is required.',
        'any.required': 'Email is required.',
    }),
    phone: Joi.string()
        .pattern(/^\d{8,15}$/)
        .required()
        .messages({
            'string.pattern.base': 'Phone number must contain only digits and be between 8 and 15 characters.',
            'string.empty': 'Phone number is required.',
            'any.required': 'Phone number is required.',
        }),
    username: Joi.string().min(3).max(50).optional(),
    age: Joi.number().integer().min(1).max(120).optional().allow(null, ''),
    theme: Joi.string().valid('light', 'dark').optional(),
});

/**
 * Schema for changing password.
 */
const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'string.empty': 'Current password is required.',
        'any.required': 'Current password is required.',
    }),
    newPassword: Joi.string().min(6).required().messages({
        'string.min': 'New password must be at least 6 characters.',
        'string.empty': 'New password is required.',
        'any.required': 'New password is required.',
    }),
});

module.exports = {
    loginSchema,
    updateProfileSchema,
    changePasswordSchema,
};
