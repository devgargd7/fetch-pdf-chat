#!/bin/bash

echo "🚀 Setting up Next.js + Prisma + AI SDK project..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one with your database URL and OpenAI API key."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Check if database is accessible
echo "🗄️  Testing database connection..."
if npm run db:push > /dev/null 2>&1; then
    echo "✅ Database connection successful!"
else
    echo "⚠️  Database connection failed. Please check your DATABASE_URL in .env"
    echo "   You can still run the development server, but database features won't work."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env file with your database URL and OpenAI API key"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Open http://localhost:3000 to view your application"
echo ""
echo "Available scripts:"
echo "  npm run dev          - Start development server"
echo "  npm run build        - Build for production"
echo "  npm run db:generate - Generate Prisma client"
echo "  npm run db:push     - Push schema to database"
echo "  npm run db:studio   - Open Prisma Studio"

