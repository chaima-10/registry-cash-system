const { PrismaClient } = require('@prisma/client');

// Optimize for Aiven Free Tier (limit connections to prevent 502/crashes)
const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasourceUrl: process.env.DATABASE_URL ? `${process.env.DATABASE_URL}${process.env.DATABASE_URL.includes('?') ? '&' : '?'}connection_limit=1&pool_timeout=90` : undefined
});

module.exports = prisma;
