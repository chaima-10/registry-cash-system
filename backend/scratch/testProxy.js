const express = require('express');
const https = require('https');
const http = require('http');

const app = express();

function fetchWithRedirects(url, redirectsLeft, callback) {
    if (redirectsLeft <= 0) {
        return callback(new Error('Too many redirects'));
    }

    let urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const req = client.get(url, { timeout: 15000 }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
            res.resume();
            const redirectUrl = res.headers.location.startsWith('http')
                ? res.headers.location
                : new URL(res.headers.location, url).toString();
            return fetchWithRedirects(redirectUrl, redirectsLeft - 1, callback);
        }
        callback(null, res);
    });

    req.on('timeout', () => { req.destroy(); callback(new Error('timeout')); });
    req.on('error', callback);
}

app.get('/proxy', (req, res) => {
    fetchWithRedirects(req.query.url, 5, (err, imgRes) => {
        if (err) return res.status(500).send(err.message);
        
        console.log("Receiving response from origin:", imgRes.statusCode);
        console.log("Headers:", imgRes.headers);

        res.set('Access-Control-Allow-Origin', '*');
        res.set('Content-Type', imgRes.headers['content-type']);
        imgRes.pipe(res);
        
        let bytes = 0;
        imgRes.on('data', chunk => bytes += chunk.length);
        imgRes.on('end', () => console.log('Finished streaming to client. Total bytes:', bytes));
    });
});

const server = app.listen(5050, () => {
    console.log('Test proxy running on 5050');
    
    // Simulate the client request
    const testUrl = "http://localhost:5050/proxy?url=https%3A%2F%2Fres.cloudinary.com%2Fdmeteqwpp%2Fimage%2Fupload%2Fv1776457251%2Fproducts%2Fqlkibbg60lbtwbknmtwa.png";
    http.get(testUrl, (res) => {
        console.log('Client received status:', res.statusCode);
        let clientBytes = 0;
        res.on('data', chunk => clientBytes += chunk.length);
        res.on('end', () => {
            console.log('Client received total bytes:', clientBytes);
            server.close();
        });
    });
});
