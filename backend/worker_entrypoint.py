#!/usr/bin/env python3
"""
Worker entrypoint that runs Celery with a health check HTTP server.
This allows Cloud Run to health check the worker container.
"""
import os
import sys
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'healthy')
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass  # Suppress request logging

def run_health_server():
    """Run health check server on port 8080"""
    server = HTTPServer(('0.0.0.0', 8080), HealthHandler)
    print("Health check server running on port 8080")
    server.serve_forever()

if __name__ == '__main__':
    # Start health check server in background thread
    health_thread = threading.Thread(target=run_health_server, daemon=True)
    health_thread.start()
    
    # Run Celery worker
    os.execvp('celery', ['celery', '-A', 'app.celery_app', 'worker', '--loglevel=info', '--concurrency=2'])

