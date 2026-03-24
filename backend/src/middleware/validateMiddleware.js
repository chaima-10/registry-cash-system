/**
 * Validation Middleware Factory
 * 
 * Creates an Express middleware function that validates the request body
 * against the provided Joi schema.
 * 
 * @param {import('joi').ObjectSchema} schema - The Joi schema to validate against.
 * @returns {Function} Express middleware function.
 */
const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, {
        abortEarly: false, // Collect ALL errors at once, not just the first one
        stripUnknown: false, // Allow extra fields to pass through (handled individually)
    });

    if (error) {
        // Convert Joi error details into a clean list of messages
        const messages = error.details.map((detail) => detail.message);
        return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: messages,
        });
    }

    next();
};

module.exports = validate;
