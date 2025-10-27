# Next.js + Prisma + AI SDK Project

A modern full-stack application built with Next.js 16, Prisma, PostgreSQL, and Vercel AI SDK.

## Tech Stack

- **Next.js 16** with App Router
- **Prisma** with PostgreSQL database
- **Vercel AI SDK** for AI integration
- **Tailwind CSS** for styling
- **TypeScript** for type safety

## Features

- 🤖 AI Chat functionality using OpenAI
- 📊 Database operations with Prisma
- 🎨 Modern UI with Tailwind CSS
- 🔧 Type-safe API routes
- 📱 Responsive design

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key (optional for basic functionality)

### Quick Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

```bash
# Copy the example environment file
cp .env.example .env
```

Update the `.env` file with your database URL and OpenAI API key:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/fetch_db?schema=public"
OPENAI_API_KEY="your-openai-api-key-here"
```

3. **Set up the database:**

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (requires running PostgreSQL)
npm run db:push
```

4. **Start the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Alternative: Use the setup script

```bash
chmod +x setup.sh
./setup.sh
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## API Routes

- `GET/POST /api/users` - User CRUD operations
- `POST /api/chat` - AI chat endpoint

## Database Schema

The project includes a basic User model with the following fields:

- `id` - Unique identifier (CUID)
- `name` - User's name
- `email` - User's email (unique)
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts
│   │   └── users/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
└── lib/
    ├── prisma.ts
    └── openai.ts
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
