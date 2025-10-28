// One-time script to add embedding column
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Enable pgvector extension if not already enabled
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('✅ pgvector extension enabled');
    
    // Add embedding column to Chunk table
    await client.query('ALTER TABLE "Chunk" ADD COLUMN IF NOT EXISTS embedding vector(1536);');
    console.log('✅ Successfully added embedding column');
    
  } catch (error) {
    console.error('Migration error:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.end();
  }
}

migrate();

