# Python PDF Processing Setup

This document explains how to set up and run the Python PDF processing server for local development.

## Prerequisites

- Python 3.9 or later
- pip (Python package manager)

## Quick Start

### Option 1: Using the provided script (Recommended)

```bash
# Make the script executable (already done)
chmod +x start-python-server.sh

# Start the Python server
./start-python-server.sh
```

### Option 2: Manual setup

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start Flask server
export FLASK_APP=api/process-pdf.py
export FLASK_ENV=development
export FLASK_RUN_PORT=8000
flask run --host=0.0.0.0 --port=8000
```

## Running Both Servers

### Option 1: Use the full development script

```bash
npm run dev:full
```

### Option 2: Run in separate terminals

```bash
# Terminal 1: Next.js server
npm run dev

# Terminal 2: Python server
npm run python:dev
```

## API Endpoints

- **Python PDF Processing**: `http://localhost:8000/api/process-pdf`
- **Next.js Upload**: `http://localhost:3000/api/upload`

## How It Works

1. Frontend uploads PDF to Next.js `/api/upload`
2. Next.js forwards the file to Python `/api/process-pdf`
3. Python extracts text chunks and bounding boxes
4. Python returns structured data to Next.js
5. Next.js saves the data to PostgreSQL database
6. Frontend receives confirmation with document ID

## Troubleshooting

### Python server not starting

- Check if Python 3.9+ is installed: `python3 --version`
- Ensure virtual environment is created: `ls venv/`
- Install dependencies: `pip install -r requirements.txt`

### Connection errors

- Ensure Python server is running on port 8000
- Check if Next.js server is running on port 3000
- Verify the URL in upload route matches your setup

### PDF processing errors

- Ensure PyMuPDF is installed: `pip list | grep PyMuPDF`
- Check if the PDF file is valid and not corrupted
- Verify file size limits (if any)

## Production Deployment

For Vercel deployment, the Python function will be automatically deployed as a serverless function. The `vercel.json` configuration handles the routing.

## Dependencies

- **Flask**: Web framework for the Python server
- **PyMuPDF**: PDF text extraction and processing
- **concurrently**: Run multiple npm scripts simultaneously (dev dependency)

