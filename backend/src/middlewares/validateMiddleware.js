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
    const { error, value } = schema.validate(req.body, {
        abortEarly: false, // Collect ALL errors at once, not just the first one
        stripUnknown: true, // Allow extra fields to pass through without causing errors (they will be removed from req.body)
    });

    if (error) {
        // Convert Joi error details into a clean list of messages
        const messages = error.details.map((detail) => detail.message);
        return res.status(400).json({
            status: 'error',
            message: `Validation failed: ${messages.join(', ')}`,
            errors: messages,
        });
    }

    req.body = value; // Update req.body with validated/stripped data
    next();
};

module.exports = validate;
