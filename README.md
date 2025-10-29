# PDF Chat Application

An AI tutor that helps students understand PDF documents through an interactive split-screen interface. Users can chat with the AI (text or voice) while the AI highlights or navigates to relevant parts of the PDF in real time.

## Project Overview

- **Goal**: Learn from PDFs with an AI tutor that can point to exact places in the document
- **UI**: Split-screen – PDF viewer on the left, chat on the right
- **AI Control**: The AI can navigate pages and draw highlights as it chats
- **Voice**: Optional voice input and spoken responses
- **Persistence**: Auth, document library, conversations, and messages are saved

## Features

- 📄 **PDF Upload & Processing** - Extract text and create embeddings from PDFs
- 💬 **AI-Powered Chat** - Ask questions about your documents using OpenAI
- 🎯 **Smart Highlighting** - Automatically highlights relevant sections in the PDF
- 🔐 **User Authentication** - Secure JWT-based authentication
- 📚 **Conversation History** - Save and manage multiple conversations per document
- 🗄️ **Database Storage** - PDFs and chunks stored in PostgreSQL for serverless compatibility

## Tech Stack

- **Next.js 16 (App Router)** – modern routing, serverless APIs
- **TypeScript** – end-to-end types
- **Prisma + PostgreSQL + pgvector** – users, sessions, docs, chunks, conversations, messages, vector search
- **OpenAI via Vercel AI SDK** – GPT-4o-mini for chat, text-embedding-3-small for embeddings
- **Tailwind CSS** – styling
- **Python + FastAPI + PyMuPDF** – robust PDF parsing and chunking
- **Browser Speech APIs** – speech-to-text and text-to-speech

## Example User Experience

1. Sign up or log in
2. Upload a PDF – it appears on the left; chat appears on the right
3. Ask: "What is a virus?"
4. The AI replies, navigates to the relevant page, and highlights the answer
5. You can leave and return later – your document and conversation remain

## Prerequisites

- Node.js 18+
- Python 3.12+
- PostgreSQL 14+ with pgvector extension
- OpenAI API key

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Set up Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env
```

Update `.env` with your credentials:

```env
PRISMA_DATABASE_URL="postgresql://username:password@localhost:5432/fetch_db"
OPENAI_API_KEY="sk-..."
JWT_SECRET="<generate-with-openssl-rand-base64-32>"
```

### 3. Set Up Database

```bash
# Create PostgreSQL database
createdb fetch_db

# Enable pgvector extension (run in psql)
psql -d fetch_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Generate Prisma client and push schema
npm run db:generate
npm run db:push
```

### 4. Start Development Servers

**Terminal 1 - Next.js:**

```bash
npm run dev
```

**Terminal 2 - Python API (for PDF processing):**

```bash
source venv/bin/activate
cd api
uvicorn process-pdf:app --host 0.0.0.0 --port 8000 --reload
```

Open [http://localhost:3000](http://localhost:3000) to use the application.

## Implementation Highlights

- **Split-screen app** (`src/app/chat/[id]/page.tsx`)

  - Loads conversation and PDF from the server
  - Renders `PDFViewer` and `ChatInterface` side-by-side
  - Wires AI-initiated actions to the viewer via callbacks (`onNavigateToPage`, `onHighlight`)

- **AI command protocol** (`src/app/api/chat/route.ts`)

  - The system prompt instructs the model to emit special commands on their own line:
    - `NAVIGATE: <page_number>`
    - `HIGHLIGHT: <page_number>,<x0>,<y0>,<x1>,<y1>`
  - The frontend parses the streamed text and applies navigation/highlights accordingly

- **PDF storage & delivery**

  - PDFs are stored as binary in Postgres (`Document.fileData`) for serverless environments
  - `GET /api/documents/[id]/pdf` streams the PDF bytes with correct headers

- **Chunking & embeddings**

  - Python service extracts text + bounding boxes, returns chunks with optional embeddings
  - Chunks are written to Postgres; embeddings persisted in a `vector(1536)` column
  - Vector search uses `embedding <=> $query::vector ORDER BY ... LIMIT 5`

- **Voice support**

  - Speech-to-text: `src/hooks/useSpeechRecognition.ts`
  - Text-to-speech: `src/utils/speechSynthesis.ts`

- **Authentication & sessions**

  - Simple email/password with session tokens
  - Middleware protects `'/dashboard'` and `'/chat'`
  - APIs check `getCurrentUser()` and return 401 if not authenticated

- **Serverless-friendly APIs**
  - All routes export `runtime = "nodejs"` and `dynamic = "force-dynamic"` with `revalidate = 0`
  - Ensures Prisma compatibility and disables static optimization
  - `vercel.json` includes rewrites for dynamic API routes

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── chat/         # Chat with AI
│   │   ├── conversations/# Conversation management
│   │   ├── documents/    # Document operations
│   │   └── upload/       # PDF upload handler
│   ├── chat/[id]/        # Chat page
│   ├── dashboard/        # Main dashboard
│   ├── login/            # Login page
│   └── register/         # Registration page
├── components/           # React components
│   ├── ChatInterface.tsx
│   ├── PDFViewer.tsx
│   └── FileUpload.tsx
├── lib/                  # Utilities
│   ├── prisma.ts         # Prisma client
│   ├── auth.ts           # Auth utilities
│   └── session.ts        # Session management
└── middleware.ts         # Next.js middleware

api/
└── process-pdf.py        # Python PDF processing API

prisma/
└── schema.prisma         # Database schema
```

## Database Schema

### Models

- **User** - User accounts with email/password
- **Session** - JWT session tokens
- **Document** - Uploaded PDFs (stored as binary in DB)
- **Chunk** - Text chunks with embeddings from PDFs
- **Conversation** - Chat conversations linked to documents
- **Message** - Individual chat messages

## Available Scripts

### Node.js

- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Prisma Studio

### Python

```bash
cd api
uvicorn process-pdf:app --host 0.0.0.0 --port 8000 --reload
```

## Deployment

### Vercel Deployment

1. **Push to GitHub:**

   ```bash
   git push origin main
   ```

2. **Import to Vercel:**

   - Connect your GitHub repository
   - Set environment variables (see `.env.example`)

3. **Configure:**
   - Vercel will automatically detect Next.js
   - Python API will be deployed as a serverless function
   - Ensure your database allows connections from Vercel IPs

### Environment Variables (Production)

Required in Vercel project settings:

- `PRISMA_DATABASE_URL` - PostgreSQL connection string with pooling
- `OPENAI_API_KEY` - Your OpenAI API key
- `JWT_SECRET` - Secret for JWT signing
- `NODE_ENV=production`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Documents

- `POST /api/upload` - Upload and process PDF
- `GET /api/documents` - List user's documents
- `GET /api/documents/[id]/pdf` - Get PDF file

### Conversations

- `POST /api/conversations` - Create conversation
- `GET /api/conversations` - List conversations
- `GET /api/conversations/[id]` - Get conversation with messages
- `DELETE /api/conversations/[id]` - Delete conversation

### Chat

- `POST /api/chat` - Send message and get AI response (streaming)

## How It Works

1. **Upload:** User uploads a PDF file
2. **Processing:** Python API extracts text chunks and bounding boxes
3. **Embedding:** OpenAI creates vector embeddings for each chunk
4. **Storage:** PDF binary, chunks, and embeddings stored in PostgreSQL
5. **Chat:** User asks questions about the document
6. **Retrieval:** Vector similarity search finds relevant chunks
7. **Response:** LLM (GPT-4o-mini) generates answer with document references
8. **Highlighting and Navigation:** LLM uses either of the tool to either highlight Relevant sections or navigate to specific page in PDF viewer.

## Troubleshooting

### PDF Processing Fails

- Ensure Python API is running on port 8000
- Check that PyMuPDF is installed: `pip install pymupdf` or `pip install -r requirements.txt`

### Database Connection Issues

- Verify PostgreSQL is running
- Check pgvector extension is installed
- Ensure connection string is correct in `.env`

### Build Errors on Vercel

- Clear build cache in Vercel dashboard
- Ensure all environment variables are set
- Check build logs for specific errors
