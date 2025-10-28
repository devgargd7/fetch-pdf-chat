from http.server import BaseHTTPRequestHandler
import json
import logging
import os
import sys
import cgi
import io

import fitz  # PyMuPDF
from openai import OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger(__name__)

# Initialize OpenAI
try:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
    logger.info("OpenAI client initialized")
except Exception as e:
    logger.error(f"OpenAI init failed: {e}")
    client = None


def generate_embedding(text):
    if not client:
        return None
    try:
        response = client.embeddings.create(input=text, model="text-embedding-3-small")
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        return None


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            logger.info("POST request received")
            
            # Get content length
            content_length = int(self.headers.get('Content-Length', 0))
            logger.info(f"Content length: {content_length}")
            
            if content_length == 0:
                self.send_json_response(400, {"error": "No data"})
                return
            
            # Read body
            body = self.rfile.read(content_length)
            
            # Parse multipart
            content_type = self.headers.get('Content-Type', '')
            logger.info(f"Content-Type: {content_type}")
            
            if 'multipart/form-data' not in content_type:
                self.send_json_response(400, {"error": "Expected multipart/form-data"})
                return
            
            # Extract boundary
            boundary = content_type.split('boundary=')[-1].strip()
            logger.info(f"Boundary: {boundary}")
            
            # Parse file from multipart data
            pdf_data = self.extract_pdf_from_multipart(body, boundary)
            
            if not pdf_data:
                self.send_json_response(400, {"error": "No PDF file found"})
                return
            
            logger.info(f"PDF data extracted: {len(pdf_data)} bytes")
            
            # Process PDF
            doc = fitz.open(stream=pdf_data, filetype="pdf")
            chunks = []
            
            for page_num, page in enumerate(doc):
                blocks = page.get_text("blocks")
                for block in blocks:
                    x0, y0, x1, y1, text, _, _ = block
                    clean_text = " ".join(text.strip().split())
                    
                    if len(clean_text) > 20:
                        embedding = generate_embedding(clean_text)
                        chunks.append({
                            "pageNumber": page_num + 1,
                            "textContent": clean_text,
                            "bboxList": [{"x0": x0, "y0": y0, "x1": x1, "y1": y1}],
                            "embedding": embedding,
                        })
            
            doc.close()
            logger.info(f"Processed {len(chunks)} chunks")
            
            self.send_json_response(200, {
                "filename": "document.pdf",
                "chunks": chunks
            })
            
        except Exception as e:
            logger.error(f"Error: {e}")
            import traceback
            logger.error(traceback.format_exc())
            self.send_json_response(500, {"error": str(e)})
    
    def send_json_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def extract_pdf_from_multipart(self, body, boundary):
        """Extract PDF data from multipart/form-data"""
        try:
            parts = body.split(f'--{boundary}'.encode())
            for part in parts:
                if b'Content-Type: application/pdf' in part or b'filename=' in part:
                    # Find data after headers
                    header_end = part.find(b'\r\n\r\n')
                    if header_end != -1:
                        data_start = header_end + 4
                        data_end = part.rfind(b'\r\n')
                        if data_end == -1:
                            data_end = len(part)
                        return part[data_start:data_end]
            return None
        except Exception as e:
            logger.error(f"Multipart parsing error: {e}")
            return None
