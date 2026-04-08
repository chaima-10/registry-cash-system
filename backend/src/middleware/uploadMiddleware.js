const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Check if we are in an environment that likely has a read-only filesystem (Vercel)
const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';

// Ensure uploads directory exists (only on local/persistent servers)
const uploadDir = path.join(__dirname, '../../uploads');
if (!isVercel) {
    try {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
    } catch (err) {
        console.warn('Could not create uploads directory, switching to memory storage if needed:', err.message);
    }
}

// Storage strategy: disk for local, memory for Vercel/Production
const storage = isVercel ? multer.memoryStorage() : multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = upload;
