const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Registry Cash System API',
            version: '1.0.0',
            description: 'API documentation for the POS system',
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Local server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = specs;
