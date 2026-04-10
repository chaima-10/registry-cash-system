#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "--- Running Render Build Script ---"

# Step 1: Install dependencies (Render usually does this but we ensure it's clean)
npm install

# Step 2: Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Step 3: Resolve failed migrations (Workaround for Render/Aiven P3018/P3009 errors)
echo "Synchronizing migration history..."
npx prisma migrate resolve --applied 20260327140255_add_tva_and_currency_support || true
npx prisma migrate resolve --applied 20260327145959_add_price_ttc_and_exchange_rate || true

# Step 4: Run Database Migrations
echo "Applying database migrations..."
npx prisma migrate deploy

# Step 4: Seed the database
# This ensures your admin user and default data exist in the production DB
echo "Seeding database..."
npx prisma db seed

echo "--- Build Finished Successfully ---"
