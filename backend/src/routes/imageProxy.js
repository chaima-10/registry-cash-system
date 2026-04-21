const express = require('express');
const router = express.Router();
const axios = require('axios');

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
            urlObj.hostname.endsWith(domain)
        );
        
        if (!isAllowed) {
            return res.status(403).json({ message: 'Domain not allowed' });
        }

        // Fetch the image
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
                'Accept': 'image/*'
            }
        });

        // Set CORS headers
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=3600');
        
        res.send(response.data);
    } catch (error) {
        console.error('Image proxy error:', error.message);
        res.status(500).json({ message: 'Failed to fetch image' });
    }
});

module.exports = router;
