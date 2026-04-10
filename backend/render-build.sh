#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "--- Running Render Build Script ---"

# Step 1: Install dependencies (Render usually does this but we ensure it's clean)
npm install

# Step 2: Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Step 3: Resolve failed migration (Workaround for Render/Aiven P3009 error)
echo "Ensuring database state is clean..."
npx prisma migrate resolve --rolled-back 20260327140255_add_tva_and_currency_support || true

# Step 4: Run Database Migrations
echo "Applying database migrations..."
npx prisma migrate deploy

# Step 4: Seed the database
# This ensures your admin user and default data exist in the production DB
echo "Seeding database..."
npx prisma db seed

echo "--- Build Finished Successfully ---"
