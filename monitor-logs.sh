#!/bin/bash

# Comprehensive PDF Processing Log Monitor
echo "🔍 PDF Processing Log Monitor"
echo "=============================="

# Function to monitor logs
monitor_logs() {
    echo "📄 Monitoring PDF processing logs..."
    echo "🛑 Press Ctrl+C to stop"
    echo "----------------------------------------"
    
    # Create a simple log file if it doesn't exist
    if [ ! -f "pdf_processing.log" ]; then
        echo "📝 Creating new log file..."
        touch pdf_processing.log
    fi
    
    # Monitor the log file
    tail -f pdf_processing.log
}

# Function to test the server
test_server() {
    echo "🧪 Testing PDF processing server..."
    echo "Sending test request..."
    
    response=$(curl -s -X POST http://localhost:8000/api/process-pdf -F "file=@package.json")
    echo "Response: $response"
    
    if [ -f "pdf_processing.log" ]; then
        echo "📄 Log file contents:"
        cat pdf_processing.log
    else
        echo "❌ No log file found"
    fi
}

# Function to show server status
show_status() {
    echo "🔍 Checking server status..."
    
    if pgrep -f "flask run" > /dev/null; then
        echo "✅ Flask server is running"
        echo "📡 Server PID: $(pgrep -f "flask run")"
    else
        echo "❌ Flask server is not running"
        echo "💡 Start it with: ./start-python-server.sh"
    fi
    
    echo ""
    echo "📁 Log files in current directory:"
    ls -la *.log 2>/dev/null || echo "No log files found"
}

# Main menu
case "${1:-monitor}" in
    "monitor")
        monitor_logs
        ;;
    "test")
        test_server
        ;;
    "status")
        show_status
        ;;
    *)
        echo "Usage: $0 [monitor|test|status]"
        echo "  monitor - Monitor logs in real-time (default)"
        echo "  test    - Test the server and show logs"
        echo "  status  - Show server status and log files"
        ;;
esac

