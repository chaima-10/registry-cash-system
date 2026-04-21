const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');

// Proxy external images with CORS headers for html2canvas
router.get('/image', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ message: 'URL parameter required' });
    }

    try {
        // Validate URL to prevent SSRF
        const allowedDomains = [
            'res.cloudinary.com',
            'cloudinary.com',
            'localhost',
            '127.0.0.1'
        ];

        const urlObj = new URL(url);
        const isAllowed = allowedDomains.some(domain =>
            urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
        );

        if (!isAllowed) {
            return res.status(403).json({ message: 'Domain not allowed' });
        }

        // Use built-in https/http — no extra dependencies needed
        const client = urlObj.protocol === 'https:' ? https : http;

        const request = client.get(url, { timeout: 10000 }, (imgRes) => {
            if (imgRes.statusCode !== 200) {
                res.status(imgRes.statusCode || 502).json({ message: 'Failed to fetch image from origin' });
                imgRes.resume(); // consume response to free memory
                return;
            }

            res.set('Access-Control-Allow-Origin', '*');
            res.set('Access-Control-Allow-Methods', 'GET');
            res.set('Cross-Origin-Resource-Policy', 'cross-origin');
            res.set('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
            res.set('Cache-Control', 'public, max-age=3600');

            imgRes.pipe(res);
        });

        request.on('timeout', () => {
            request.destroy();
            res.status(504).json({ message: 'Image request timed out' });
        });

        request.on('error', (err) => {
            console.error('Image proxy error:', err.message);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Failed to fetch image' });
            }
        });

    } catch (error) {
        console.error('Image proxy error:', error.message);
        res.status(500).json({ message: 'Invalid URL or server error' });
    }
});

module.exports = router;
