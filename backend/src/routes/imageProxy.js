const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');

// Follow HTTP/HTTPS redirects up to `maxRedirects` times
function fetchWithRedirects(url, redirectsLeft, callback) {
    if (redirectsLeft <= 0) {
        return callback(new Error('Too many redirects'));
    }

    let urlObj;
    try {
        urlObj = new URL(url);
    } catch (e) {
        return callback(new Error('Invalid URL'));
    }

    const client = urlObj.protocol === 'https:' ? https : http;

    const options = {
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    };

    const req = client.get(url, options, (res) => {
        // Follow redirects (301, 302, 303, 307, 308)
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
            res.resume(); // discard body
            const redirectUrl = res.headers.location.startsWith('http')
                ? res.headers.location
                : new URL(res.headers.location, url).toString();
            return fetchWithRedirects(redirectUrl, redirectsLeft - 1, callback);
        }
        callback(null, res);
    });

    req.on('timeout', () => {
        req.destroy();
        callback(new Error('Request timed out'));
    });

    req.on('error', callback);
}

// Proxy external images with CORS headers for html2canvas
router.options('/image', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Range');
    res.set('Access-Control-Max-Age', '86400');
    res.sendStatus(200);
});

router.get('/image', (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ message: 'URL parameter required' });
    }

    // Any valid URL is allowed as long as we can fetch it
    // We will check the content-type later to ensure it's an image

    fetchWithRedirects(url, 5, (err, imgRes) => {
        if (err) {
            console.error('Image proxy error:', err.message);
            return res.status(502).json({ message: 'Failed to fetch image: ' + err.message });
        }

        if (imgRes.statusCode !== 200) {
            imgRes.resume();
            return res.status(imgRes.statusCode || 502).json({
                message: `Origin returned ${imgRes.statusCode}`
            });
        }

        const contentType = imgRes.headers['content-type'];
        if (contentType && !contentType.startsWith('image/')) {
            imgRes.resume();
            return res.status(403).json({ message: 'Resource is not an image' });
        }

        // Comprehensive CORS headers
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Range');
        res.set('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Accept-Ranges');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Content-Type', contentType || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=3600');

        imgRes.pipe(res);
    });
});

module.exports = router;
