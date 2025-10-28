// Test script to verify embeddings and pgvector setup
const { PrismaClient } = require('./src/generated/client');

const prisma = new PrismaClient();

async function testEmbeddings() {
  try {
    console.log('🧪 Testing embeddings and pgvector setup...\n');

    // Test 1: Check if we can create a document with embeddings
    const testEmbedding = Array.from({ length: 1536 }, () => Math.random());
    const vectorString = `[${testEmbedding.join(',')}]`;

    console.log('📝 Creating test document with embedding...');
    const document = await prisma.document.create({
      data: {
        filename: 'test-embedding.pdf',
        chunks: {
          create: {
            pageNumber: 1,
            textContent: 'This is a test chunk for embedding verification.',
            bboxList: [{ x0: 0, y0: 0, x1: 100, y1: 100 }],
            embedding: vectorString,
          },
        },
      },
      include: {
        chunks: true,
      },
    });

    console.log('✅ Document created successfully!');
    console.log(`📄 Document ID: ${document.id}`);
    console.log(`📊 Chunks created: ${document.chunks.length}`);
    console.log(`🔢 Embedding dimension: ${testEmbedding.length}`);

    // Test 2: Query the embedding
    console.log('\n🔍 Testing vector query...');
    const chunks = await prisma.chunk.findMany({
      where: {
        documentId: document.id,
      },
    });

    console.log(`📋 Found ${chunks.length} chunks`);
    if (chunks[0]?.embedding) {
      console.log('✅ Embedding stored successfully!');
      console.log(`🔢 Vector length: ${JSON.parse(chunks[0].embedding).length}`);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await prisma.document.delete({
      where: { id: document.id },
    });
    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('vector')) {
      console.log('\n💡 Make sure pgvector extension is enabled:');
      console.log('   CREATE EXTENSION IF NOT EXISTS vector;');
    }
    
    if (error.message.includes('connection')) {
      console.log('\n💡 Check your DATABASE_URL in .env file');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testEmbeddings();

