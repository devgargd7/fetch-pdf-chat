#!/bin/bash

# Script to tail PDF processing logs
echo "🔍 Looking for PDF processing log files..."

# Find the most recent log file
LOG_FILE="pdf_processing_new.log"

if [ ! -f "$LOG_FILE" ]; then
    echo "❌ Log file not found: $LOG_FILE"
    echo "💡 Make sure the Python server is running and has processed at least one request."
    echo "💡 Start the server with: ./start-python-server.sh"
    exit 1
fi

echo "📄 Tailing log file: $LOG_FILE"
echo "🛑 Press Ctrl+C to stop"
echo "----------------------------------------"

# Tail the log file with timestamps
tail -f "$LOG_FILE"
