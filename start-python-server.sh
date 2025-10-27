#!/bin/bash

# Start FastAPI PDF processing server for local development
# This runs on port 8000 to avoid conflicts with Next.js on 3000

echo "🐍 Starting FastAPI PDF processing server..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9 or later."
    exit 1
fi

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

# Load environment variables from .env file
if [ -f ".env" ]; then
    echo "📋 Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start FastAPI server with uvicorn
echo "🚀 Starting FastAPI server on http://localhost:8000"
echo "📝 PDF processing endpoint: http://localhost:8000/api/process-pdf"
echo "📄 API docs: http://localhost:8000/docs"
echo "🛑 Press Ctrl+C to stop the server"

export PYTHONUNBUFFERED=1
uvicorn src.api.process-pdf:app --host 0.0.0.0 --port 8000 --reload
