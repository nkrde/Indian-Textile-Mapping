import os
import re
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, HTTPServer

class RangeRequestHandler(SimpleHTTPRequestHandler):
    """
    Custom HTTP request handler that extends SimpleHTTPRequestHandler
    to support HTTP Range Requests (essential for seeking/scrubbing large video files).
    """
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()
            
        ctype = self.guess_type(path)
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, "File not found")
            return None
            
        range_header = self.headers.get('Range')
        if not range_header:
            # No range requested, return standard response
            return super().send_head()
            
        # Parse range header: e.g. bytes=1000-2000 or bytes=1000-
        match = re.match(r'bytes=(\d+)-(\d*)', range_header)
        if not match:
            return super().send_head()
            
        start = int(match.group(1))
        end_str = match.group(2)
        
        file_size = os.path.getsize(path)
        end = int(end_str) if end_str else file_size - 1
        
        if start >= file_size or end >= file_size or start > end:
            self.send_error(416, "Requested Range Not Satisfiable")
            f.close()
            return None
            
        # Return 206 Partial Content
        self.send_response(206)
        self.send_header('Content-type', ctype)
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        
        # Seek file to start offset
        f.seek(start)
        # Store bounds to be used in copyfile
        self.range_start = start
        self.range_end = end
        return f

    def copyfile(self, source, outputfile):
        """
        Copy only the requested range of bytes if bounds are defined.
        """
        if hasattr(self, 'range_start') and hasattr(self, 'range_end'):
            remaining = self.range_end - self.range_start + 1
            buffer_size = 64 * 1024 # 64KB chunks
            while remaining > 0:
                chunk_size = min(buffer_size, remaining)
                try:
                    data = source.read(chunk_size)
                    if not data:
                        break
                    outputfile.write(data)
                    remaining -= len(data)
                except ConnectionAbortedError:
                    # Browser closed the connection (e.g. stopped playing or seeked elsewhere)
                    break
        else:
            super().copyfile(source, outputfile)

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, RangeRequestHandler)
    
    # Print welcome banners
    print("=" * 70)
    print("      KASEZ CIRCULAR TEXTILE SYSTEM HUB - LOCAL WEB SERVER")
    print("=" * 70)
    print(f" Server started successfully on port {port}")
    print(f" Local Link: http://localhost:{port}/index.html")
    print("-" * 70)
    print(" Press Ctrl+C to stop the server.")
    print("=" * 70)
    
    # Attempt to open default browser automatically
    try:
        webbrowser.open(f"http://localhost:{port}/index.html")
    except Exception as e:
        print(f" Could not auto-open browser: {e}")
        
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n Shutting down server...")
        httpd.server_close()
        sys.exit(0)

if __name__ == "__main__":
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port)
