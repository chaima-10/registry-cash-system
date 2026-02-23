const axios = require('axios');

async function debugEndpoint() {
    try {
        console.log('1. Logging in to get token...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin',
            password: 'admin'
        });
        const token = loginRes.data.token;
        console.log('   Token received.');

        console.log('\n2. Requesting GET /products...');
        const res = await axios.get('http://localhost:5000/api/products', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('   Status:', res.status);
        console.log('   Data Type:', Array.isArray(res.data) ? 'Array' : typeof res.data);
        console.log('   Data Length:', res.data.length);
        if (res.data.length > 0) {
            console.log('   First Item Keys:', Object.keys(res.data[0]));
            console.log('   First Item Sample:', JSON.stringify(res.data[0], null, 2));
        }

    } catch (error) {
        console.error('Endpoint Error:', error.response ? {
            status: error.response.status,
            data: error.response.data
        } : error.message);
    }
}

debugEndpoint();
