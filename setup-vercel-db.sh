#!/bin/bash

# Database Setup Script for Vercel Postgres
# Run this script after setting up your Vercel Postgres database

echo "🚀 Setting up database schema for Vercel Postgres..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "Please set your Vercel Postgres connection string:"
    echo "export DATABASE_URL='postgres://username:password@host:port/database'"
    exit 1
fi

echo "✅ DATABASE_URL is set"

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Push the schema to the database
echo "🗄️ Pushing schema to database..."
npx prisma db push

# Run migrations
echo "🔄 Running migrations..."
npx prisma migrate deploy

echo "✅ Database setup complete!"
echo "Your app is now ready to use the database."
