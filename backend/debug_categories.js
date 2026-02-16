const axios = require('axios');

async function debugCategories() {
    try {
        console.log('1. Logging in...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin',
            password: 'admin'
        });
        const token = loginRes.data.token;

        console.log('2. Requesting GET /categories...');
        const res = await axios.get('http://localhost:5000/api/categories', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('   Status:', res.status);
        console.log('   Data Length:', res.data.length);

    } catch (error) {
        console.error('Category Endpoint Error:', error.response ? {
            status: error.response.status,
            data: error.response.data
        } : error.message);
    }
}

debugCategories();
