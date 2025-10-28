#!/usr/bin/env python3

import os
from datetime import datetime


def log_to_file(message):
    """Write message to log file with timestamp"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    try:
        with open("pdf_processing.log", "a") as f:
            f.write(f"{timestamp} - {message}\n")
            f.flush()
        print(f"✅ Logged: {message}")
    except Exception as e:
        print(f"❌ Failed to write to log file: {e}")

if __name__ == "__main__":
    print(f"Current working directory: {os.getcwd()}")
    log_to_file("🧪 Test log message")
    print("Test completed!")

