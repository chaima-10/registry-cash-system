const prisma = require('./src/config/prisma');

console.log("Prisma Client Model Keys:");
const keys = Object.keys(prisma).filter(k => !k.startsWith('_') && typeof prisma[k] === 'object');
console.log(keys);
process.exit(0);
