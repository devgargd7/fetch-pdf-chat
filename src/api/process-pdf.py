# This file goes in the root /api directory, NOT in /app/api
# Vercel will deploy this as a Python Serverless Function
# Using FastAPI for better logging and reliability

import io
import logging
import os
import sys
from datetime import datetime
from typing import Optional

import fitz
import PyPDF2
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from openai import OpenAI

# Initialize FastAPI app
app = FastAPI(title="PDF Processing API", version="1.0.0")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("pdf_processing.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

logger.info("🚀 PDF Processing Server Started!")
logger.info("📝 Ready to process PDF files...")
logger.info("📄 Logs are being written to: pdf_processing.log")


def generate_embedding(text):
    """Generate embedding for text using OpenAI's text-embedding-3-small model"""
    try:
        response = client.embeddings.create(input=text, model="text-embedding-3-small")
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        return None


@app.post("/api/process-pdf")
async def process_pdf(file: UploadFile = File(...)):
    logger.info(f"🚀 PDF processing request received for file: {file.filename}")
    
    if not file.filename:
        logger.error("❌ No file provided")
        raise HTTPException(status_code=400, detail="No file provided")
    
    if not file.filename.lower().endswith('.pdf'):
        logger.error(f"❌ Invalid file type: {file.filename}")
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    logger.info(f"📁 Processing file: {file.filename}")
    
    try:
        pdf_bytes = await file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        all_chunks = []
        
        for page_num, page in enumerate(doc):
            # Using get_text("blocks") as discussed.
            # A block is roughly equivalent to a paragraph.
            blocks = page.get_text("blocks")
            for i, block in enumerate(blocks):
                x0, y0, x1, y1, text, _, _ = block
                
                clean_text = " ".join(text.strip().split())
                
                # Only store chunks with meaningful text content
                if len(clean_text) > 20:
                    # Generate embedding for this chunk
                    embedding = generate_embedding(clean_text)
                    
                    chunk_data = {
                        "pageNumber": page_num + 1,
                        "textContent": clean_text,
                        "bboxList": [{"x0": x0, "y0": y0, "x1": x1, "y1": y1}],
                        "embedding": embedding,  # OpenAI embedding vector (1536 dimensions)
                    }
                    logger.info(f"📄 Processing chunk on page {page_num + 1}:")
                    logger.info(f"   Text: {clean_text[:100]}...")
                    logger.info(f"   Bbox: x0={x0}, y0={y0}, x1={x1}, y1={y1}")
                    logger.info(f"   Embedding generated: {embedding is not None}")
                    logger.info("--------------------------------")
                    all_chunks.append(chunk_data)
        
        logger.info(f"✅ Successfully processed {len(all_chunks)} chunks from {file.filename}")
        return JSONResponse(content={"filename": file.filename, "chunks": all_chunks})
        
    except Exception as e:
        logger.error(f"❌ Error processing file {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


# Vercel's Python runtime looks for the 'app' variable by default.
