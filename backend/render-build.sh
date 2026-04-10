#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "--- Running Render Build Script ---"

# Step 1: Install dependencies (Render usually does this but we ensure it's clean)
npm install

# Step 2: Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Step 3: Run Database Migrations
# We use 'migrate deploy' for production to apply pending migrations safely
echo "Applying database migrations..."
npx prisma migrate deploy

# Step 4: Seed the database
# This ensures your admin user and default data exist in the production DB
echo "Seeding database..."
npx prisma db seed

echo "--- Build Finished Successfully ---"
