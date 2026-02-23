const axios = require('axios');

async function testApi() {
    try {
        console.log('1. Attempting Login...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin',
            password: 'admin'
        });

        const token = loginRes.data.token;
        console.log('Login Successful. Token received.');

        console.log('2. Fetching Products with Token...');
        const productsRes = await axios.get('http://localhost:5000/api/products', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`Products Fetched: ${productsRes.data.length}`);
        if (productsRes.data.length > 0) {
            console.log('Sample Product:', productsRes.data[0].name);
        } else {
            console.log('No products found in API response.');
        }

    } catch (error) {
        console.error('API Error:', error.response ? error.response.data : error.message);
    }
}

testApi();
