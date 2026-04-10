#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "--- Running Render Build Script ---"

# Step 1: Install dependencies (Render usually does this but we ensure it's clean)
npm install

# Step 2: Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Step 3: Repair and Synchronize Schema
# Prisma thinks migrations are done, but columns are missing. 
# db push will force the database to match the schema.prisma.
echo "Forcing database schema synchronization..."
npx prisma db push --accept-data-loss

# Step 4: Seed the database
# This ensures your admin user and default data exist in the production DB
echo "Seeding database..."
npx prisma db seed

echo "--- Build Finished Successfully ---"
