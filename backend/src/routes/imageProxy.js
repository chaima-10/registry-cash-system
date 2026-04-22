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

    const req = client.get(url, { timeout: 15000 }, (res) => {
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
router.get('/image', (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ message: 'URL parameter required' });
    }

    // Validate URL to prevent SSRF
    const allowedDomains = [
        'res.cloudinary.com',
        'cloudinary.com',
    ];

    let urlObj;
    try {
        urlObj = new URL(url);
    } catch (e) {
        return res.status(400).json({ message: 'Invalid URL' });
    }

    const isAllowed = allowedDomains.some(domain =>
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
        return res.status(403).json({ message: 'Domain not allowed' });
    }

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

        // CORS headers so html2canvas can draw the image on canvas
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=3600');

        imgRes.pipe(res);
    });
});

module.exports = router;
