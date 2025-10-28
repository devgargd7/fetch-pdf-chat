"""
Vercel Serverless Function for PDF Processing
This is a simple handler that works with Vercel's Python runtime
"""

import io
import json
import logging
import os
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs

import fitz  # PyMuPDF
from openai import OpenAI

# Configure logging to stdout for Vercel
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def generate_embedding(text):
    """Generate embedding for text using OpenAI's text-embedding-3-small model"""
    try:
        response = client.embeddings.create(
            input=text,
            model="text-embedding-3-small"
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        return None


class handler(BaseHTTPRequestHandler):
    """Vercel serverless function handler"""
    
    def send_json_error(self, code, message):
        """Send JSON error response"""
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        error_data = json.dumps({"error": message})
        self.wfile.write(error_data.encode())
    
    def do_POST(self):
        """Handle POST requests for PDF processing"""
        try:
            logger.info("📄 PDF processing request received")
            logger.info(f"Headers: {dict(self.headers)}")
            
            # Get content type and boundary
            content_type = self.headers.get('Content-Type', '')
            if 'multipart/form-data' not in content_type:
                self.send_json_error(400, "Expected multipart/form-data")
                return
            
            # Parse boundary
            boundary = content_type.split('boundary=')[-1]
            
            # Read the request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            # Parse multipart data
            pdf_data = self.parse_multipart(body, boundary)
            
            if not pdf_data:
                self.send_json_error(400, "No PDF file found in request")
                return
            
            # Process the PDF
            logger.info("🔄 Processing PDF...")
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
                "filename": "document.pdf",
                "chunks": all_chunks
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode())
            
            logger.info(f"✅ Successfully processed {len(all_chunks)} chunks")
            
        except Exception as e:
            logger.error(f"❌ Error processing PDF: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            self.send_json_error(500, f"Error processing PDF: {str(e)}")
    
    def parse_multipart(self, body, boundary):
        """Parse multipart form data to extract PDF"""
        try:
            boundary_bytes = f'--{boundary}'.encode()
            parts = body.split(boundary_bytes)
            
            for part in parts:
                if b'Content-Type: application/pdf' in part or b'filename=' in part:
                    # Find the start of the file data (after the headers)
                    header_end = part.find(b'\r\n\r\n')
                    if header_end != -1:
                        pdf_start = header_end + 4
                        pdf_end = part.rfind(b'\r\n')
                        if pdf_end == -1:
                            pdf_end = len(part)
                        return part[pdf_start:pdf_end]
            
            return None
        except Exception as e:
            logger.error(f"Error parsing multipart data: {e}")
            return None
