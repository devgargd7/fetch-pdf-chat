# Database Setup with pgvector

This guide will help you set up PostgreSQL with pgvector extension for storing OpenAI embeddings.

## Prerequisites

- PostgreSQL 12+ installed
- pgvector extension (for vector similarity search)

## Setup Steps

### 1. Install PostgreSQL

**macOS (using Homebrew):**

```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE fetch_db;

# Create user (optional)
CREATE USER fetch_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE fetch_db TO fetch_user;
```

### 3. Enable pgvector Extension

```bash
# Connect to your database
psql -d fetch_db

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### 4. Update Environment Variables

Create or update your `.env` file:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/fetch_db?schema=public"
OPENAI_API_KEY="your-openai-api-key-here"
```

### 5. Run Prisma Migrations

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Or create migration
npx prisma migrate dev --name init
```

### 6. Verify Setup

```bash
# Check if tables were created
npx prisma studio
```

## Vector Operations

With pgvector enabled, you can perform similarity searches:

```sql
-- Find similar chunks using cosine similarity
SELECT text_content, embedding <=> '[0.1,0.2,0.3,...]' as distance
FROM chunks
ORDER BY embedding <=> '[0.1,0.2,0.3,...]'
LIMIT 5;
```

## Troubleshooting

### Common Issues:

1. **Extension not found**: Make sure pgvector is installed
2. **Permission denied**: Check database user permissions
3. **Connection refused**: Verify PostgreSQL is running

### Useful Commands:

```bash
# Check PostgreSQL status
brew services list | grep postgresql

# Restart PostgreSQL
brew services restart postgresql

# Check database connection
psql -d fetch_db -c "SELECT version();"
```

## Production Notes

- Use connection pooling for production
- Consider using Vercel Postgres (has pgvector pre-installed)
- Monitor vector storage usage (embeddings are large)
- Implement proper indexing for vector searches

