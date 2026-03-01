const mysql = require('mysql2/promise');
require('dotenv').config();

async function inspect() {
    const url = process.env.DATABASE_URL;
    console.log('Connecting to:', url);

    // Parse URL manually or use a simpler connection
    // DATABASE_URL="mysql://root:@localhost:3306/registry-cash-system-db"
    const connection = await mysql.createConnection(url);

    try {
        const [rows] = await connection.execute('DESCRIBE User');
        console.log('User table structure:');
        console.table(rows);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

inspect();
