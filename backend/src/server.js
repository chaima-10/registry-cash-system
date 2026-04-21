const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars before anything else
dotenv.config();

const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swaggerOptions');

// Routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const saleRoutes = require('./routes/saleRoutes');
const giveawayRoutes = require('./routes/giveawayRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

const path = require('path');

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow local development and any Vercel deployment
        if (!origin || 
            origin.includes('vercel.app') || 
            origin.includes('localhost') || 
            origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        callback(null, true); // Fallback to allow all for now to maintain stability
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));
app.use(express.json());
app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, '../uploads')));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs`);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/sales', saleRoutes);
app.use('/api/giveaways', giveawayRoutes);
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/proxy', require('./routes/imageProxy'));

app.get('/', (req, res) => {
    res.send('Backend is running!');
});

const startServer = async () => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

// Handle unhandled rejections to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();
