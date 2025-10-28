# Authentication & Persistence System

## 🎉 What's Been Implemented

Your PDF chat application now includes a complete authentication and data persistence system!

### ✅ Features Implemented

#### 1. **User Authentication**

- **Registration** (`/register`):

  - Email with format validation (regex: `^[^\s@]+@[^\s@]+\.[^\s@]+$`)
  - Password with minimum 6 characters requirement
  - Password confirmation matching
  - Secure password hashing using bcrypt

- **Login** (`/login`):

  - Email/password authentication
  - Token-based session management
  - HTTP-only secure cookies

- **Session Management**:
  - JWT tokens with 7-day expiry
  - Stored in database with user association
  - Automatic session cleanup on expiry
  - Logout functionality

#### 2. **Route Protection**

- Middleware protects `/dashboard` and `/chat/*` routes
- Unauthenticated users redirected to `/login`
- Authenticated users on public routes redirected to `/dashboard`

#### 3. **File Persistence**

- PDFs saved to `uploads/{userId}/{timestamp}_{filename}`
- Files associated with user accounts in database
- File paths stored for future access
- Works locally and will work when deployed (with proper storage configuration)

#### 4. **Chat Persistence**

- Multiple conversations per document
- All messages saved to database
- Conversation history loads when revisiting
- Conversations have titles and timestamps
- Messages include role (user/assistant) and content

#### 5. **Dashboard**

- View all uploaded documents
- See conversation count per document
- Create new conversations for any document
- View recent conversations
- Upload new PDFs
- User info and logout button

## 🗄️ Database Schema

```prisma
User
├── id: String (cuid)
├── email: String (unique)
├── password: String (hashed)
├── sessions: Session[]
├── documents: Document[]
└── conversations: Conversation[]

Session
├── id: String (cuid)
├── token: String (unique, JWT)
├── userId: String (FK → User)
├── expiresAt: DateTime
└── user: User

Document
├── id: String (cuid)
├── filename: String
├── filePath: String (uploads/{userId}/...)
├── userId: String (FK → User)
├── user: User
├── chunks: Chunk[]
└── conversations: Conversation[]

Conversation
├── id: String (cuid)
├── title: String (default: "New Conversation")
├── userId: String (FK → User)
├── documentId: String (FK → Document)
├── user: User
├── document: Document
└── messages: Message[]

Message
├── id: String (cuid)
├── role: String ("user" | "assistant")
├── content: String
├── conversationId: String (FK → Conversation)
└── conversation: Conversation

Chunk (unchanged)
├── id: String (cuid)
├── pageNumber: Int
├── textContent: String
├── bboxList: Json
├── documentId: String (FK → Document)
├── embedding: vector(1536)
└── document: Document
```

## 🚀 How to Use

### First Time Setup

1. **Make sure your `.env` file has:**

```env
DATABASE_URL="postgresql://devgarg:dev@localhost:5432/fetch_db?schema=public"
OPENAI_API_KEY="your-openai-api-key"
JWT_SECRET="your-secret-jwt-key-change-this-in-production"
NODE_ENV="development"
```

2. **Start the application:**

```bash
npm run dev:full
```

This starts both the Next.js server and Python PDF processing service.

### Using the Application

1. **Visit** `http://localhost:3000`

   - You'll be redirected to `/login`

2. **Create an account:**

   - Click "Sign up"
   - Enter your email (must be valid format)
   - Enter password (min 6 characters)
   - Confirm password
   - Click "Create Account"

3. **Upload PDFs:**

   - After login, you're on the dashboard
   - Click "Choose File" to upload a PDF
   - Wait for processing (PDF is parsed, embedded, saved)
   - File appears in "Your Documents" section

4. **Start a conversation:**

   - Click "New Conversation" on any document
   - You're taken to the chat page
   - Ask questions about the PDF
   - Messages are saved automatically

5. **Return to conversations:**

   - Go to dashboard to see all conversations
   - Click any conversation to continue where you left off
   - All chat history is loaded automatically

6. **Create multiple conversations:**
   - Each document can have multiple conversations
   - Useful for different topics or analysis approaches
   - All conversations are separate and preserved

## 📁 File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts        # Login endpoint
│   │   │   ├── register/route.ts     # Registration endpoint
│   │   │   ├── logout/route.ts       # Logout endpoint
│   │   │   └── me/route.ts           # Current user info
│   │   ├── chat/route.ts             # Chat with persistence
│   │   ├── upload/route.ts           # File upload with user association
│   │   ├── documents/route.ts        # List user's documents
│   │   └── conversations/
│   │       ├── route.ts              # List/create conversations
│   │       └── [id]/route.ts         # Get/delete conversation
│   ├── login/page.tsx                # Login page
│   ├── register/page.tsx             # Registration page
│   ├── dashboard/page.tsx            # Dashboard with documents & conversations
│   ├── chat/[id]/page.tsx           # Chat page for specific conversation
│   └── page.tsx                      # Home (redirects to dashboard)
├── components/
│   └── ChatInterface.tsx             # Updated with conversation support
├── lib/
│   ├── auth.ts                       # Auth utilities (hashing, tokens)
│   ├── session.ts                    # Session management (cookies)
│   └── prisma.ts                     # Prisma client
└── middleware.ts                     # Route protection

uploads/                              # User uploaded files (gitignored)
└── {userId}/
    └── {timestamp}_{filename}.pdf
```

## 🔐 Security Features

1. **Password Security:**

   - Bcrypt hashing with salt rounds (10)
   - Passwords never stored in plain text

2. **Session Security:**

   - JWT tokens with expiration
   - HTTP-only cookies (not accessible via JavaScript)
   - Secure flag in production
   - SameSite: lax to prevent CSRF

3. **Route Protection:**

   - Middleware validates session on every request
   - Automatic redirect for unauthorized access
   - Token validation includes database check

4. **Data Isolation:**
   - Users can only access their own documents
   - Users can only access their own conversations
   - API routes verify ownership before operations

## 🌐 Deployment Considerations

When deploying to production (e.g., Vercel):

1. **Environment Variables:**

   - Set strong `JWT_SECRET` (use a random generator)
   - Set `NODE_ENV=production`
   - Configure proper `DATABASE_URL` for production DB

2. **File Storage:**

   - Local filesystem won't work on serverless
   - Options:
     - **Vercel Blob Storage**: `npm install @vercel/blob`
     - **AWS S3**: Use AWS SDK
     - **Cloudinary**: For document storage
   - Update `src/app/api/upload/route.ts` to use chosen storage

3. **Database:**

   - Use managed PostgreSQL (e.g., Vercel Postgres, Supabase, Neon)
   - Ensure pgvector extension is available
   - Run migrations on production DB

4. **Python Service:**
   - Deploy as Vercel serverless function (already configured)
   - Or use separate service (Railway, Render, etc.)

## 📝 API Reference

### Authentication

**POST `/api/auth/register`**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

**POST `/api/auth/login`**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**POST `/api/auth/logout`**
No body required.

**GET `/api/auth/me`**
Returns current user info.

### Documents

**GET `/api/documents`**
Returns user's documents.

**POST `/api/upload`**
Upload PDF (FormData with "file" field).

### Conversations

**GET `/api/conversations`**
Returns user's conversations (recent 20).

**POST `/api/conversations`**

```json
{
  "documentId": "doc_id",
  "title": "Optional title"
}
```

**GET `/api/conversations/{id}`**
Returns conversation with messages.

**DELETE `/api/conversations/{id}`**
Deletes conversation.

### Chat

**POST `/api/chat`**

```json
{
  "messages": [{ "role": "user", "content": "What is this about?" }],
  "documentId": "doc_id",
  "conversationId": "conv_id"
}
```

Returns streaming response.

## 🐛 Troubleshooting

**Can't login after database reset:**

- Clear browser cookies
- Create a new account

**Upload fails:**

- Check Python server is running (`npm run python:dev`)
- Verify OpenAI API key is set
- Check uploads directory permissions

**Database connection errors:**

- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure pgvector extension is installed

**Session expired errors:**

- Sessions expire after 7 days
- Login again to create new session

## 🎨 Customization

### Change Session Duration

Edit `src/lib/auth.ts`:

```typescript
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // Change this
```

### Change Password Requirements

Edit `src/lib/auth.ts`:

```typescript
export function isValidPassword(password: string): boolean {
  return password.length >= 6; // Modify this
}
```

### Customize UI

All pages use Tailwind CSS with a dark theme. Modify:

- `/src/app/login/page.tsx`
- `/src/app/register/page.tsx`
- `/src/app/dashboard/page.tsx`

## 🚀 Next Steps

Consider adding:

- [ ] Password reset functionality
- [ ] Email verification
- [ ] User profile management
- [ ] Document sharing between users
- [ ] Export conversation as PDF/Markdown
- [ ] Search across conversations
- [ ] Tags/categories for documents
- [ ] File management (delete documents)
- [ ] Rate limiting on API routes
- [ ] Two-factor authentication (2FA)

## 🎉 You're All Set!

Your PDF chat application now has:
✅ Secure user authentication
✅ Persistent file storage
✅ Multiple conversations per document
✅ Complete chat history
✅ User-specific data isolation
✅ Beautiful dashboard UI
✅ Protected routes

Start chatting with your PDFs! 🚀
