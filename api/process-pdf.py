"""
Vercel Serverless Function for PDF Processing
Simple handler compatible with Vercel's Python runtime
"""

import cgi
import io
import json
import logging
import os
import sys

import fitz  # PyMuPDF
from openai import OpenAI

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

# Initialize OpenAI client
try:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY not found in environment")
    client = OpenAI(api_key=api_key)
    logger.info("OpenAI client initialized")
except Exception as e:
    logger.error(f"Failed to initialize OpenAI client: {e}")
    client = None


def generate_embedding(text):
    """Generate embedding for text using OpenAI's text-embedding-3-small model"""
    if not client:
        logger.error("OpenAI client not initialized")
        return None
    try:
        response = client.embeddings.create(
            input=text,
            model="text-embedding-3-small"
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        return None


def handler(environ, start_response):
    """
    WSGI handler for Vercel serverless functions
    """
    try:
        logger.info("PDF processing request received")
        logger.info(f"Method: {environ.get('REQUEST_METHOD')}")
        logger.info(f"Content-Type: {environ.get('CONTENT_TYPE')}")
        
        # Only accept POST requests
        if environ.get('REQUEST_METHOD') != 'POST':
            start_response('405 Method Not Allowed', [
                ('Content-Type', 'application/json'),
            ])
            return [json.dumps({"error": "Method not allowed"}).encode()]
        
        # Parse multipart form data
        content_type = environ.get('CONTENT_TYPE', '')
        if 'multipart/form-data' not in content_type:
            start_response('400 Bad Request', [
                ('Content-Type', 'application/json'),
            ])
            return [json.dumps({"error": "Expected multipart/form-data"}).encode()]
        
        # Get the request body
        content_length = int(environ.get('CONTENT_LENGTH', 0))
        if content_length == 0:
            start_response('400 Bad Request', [
                ('Content-Type', 'application/json'),
            ])
            return [json.dumps({"error": "Empty request body"}).encode()]
        
        body = environ['wsgi.input'].read(content_length)
        
        # Parse the form data
        environ['wsgi.input'] = io.BytesIO(body)
        form = cgi.FieldStorage(
            fp=environ['wsgi.input'],
            environ=environ,
            keep_blank_values=True
        )
        
        # Get the PDF file
        if 'file' not in form:
            start_response('400 Bad Request', [
                ('Content-Type', 'application/json'),
            ])
            return [json.dumps({"error": "No file uploaded"}).encode()]
        
        file_item = form['file']
        if not file_item.file:
            start_response('400 Bad Request', [
                ('Content-Type', 'application/json'),
            ])
            return [json.dumps({"error": "Invalid file"}).encode()]
        
        pdf_data = file_item.file.read()
        logger.info(f"PDF file received, size: {len(pdf_data)} bytes")
        
        # Process the PDF
        doc = fitz.open(stream=pdf_data, filetype="pdf")
        all_chunks = []
        
        for page_num, page in enumerate(doc):
            blocks = page.get_text("blocks")
            for block in blocks:
                x0, y0, x1, y1, text, _, _ = block
                clean_text = " ".join(text.strip().split())
                
                if len(clean_text) > 20:
                    embedding = generate_embedding(clean_text)
                    
                    chunk_data = {
                        "pageNumber": page_num + 1,
                        "textContent": clean_text,
                        "bboxList": [{"x0": x0, "y0": y0, "x1": x1, "y1": y1}],
                        "embedding": embedding,
                    }
                    all_chunks.append(chunk_data)
                    logger.info(f"✓ Chunk from page {page_num + 1}: {clean_text[:50]}...")
        
        doc.close()
        
        # Send response
        response_data = {
            "filename": file_item.filename or "document.pdf",
            "chunks": all_chunks
        }
        
        start_response('200 OK', [
            ('Content-Type', 'application/json'),
        ])
        
        logger.info(f"✅ Successfully processed {len(all_chunks)} chunks")
        return [json.dumps(response_data).encode()]
        
    except Exception as e:
        logger.error(f"❌ Error processing PDF: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        
        start_response('500 Internal Server Error', [
            ('Content-Type', 'application/json'),
        ])
        return [json.dumps({"error": f"Error processing PDF: {str(e)}"}).encode()]
