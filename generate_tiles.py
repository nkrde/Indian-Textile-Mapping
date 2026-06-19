import fitz
import os
import math
import time
from PIL import Image

def generate_tiles(pdf_path, output_dir="tiles", max_zoom=5, tile_size=256):
    print("=" * 60)
    print(f"STARTING TILE GENERATION: {pdf_path}")
    print("=" * 60)
    t_start = time.time()
    
    # Open the PDF doc
    doc = fitz.open(pdf_path)
    page = doc[0]
    
    # PDF dimensions
    pdf_w = page.rect.width   # 30630.0
    pdf_h = page.rect.height  # 2383.0
    print(f"PDF Dimensions: {pdf_w}x{pdf_h}")
    
    # Create output directories
    os.makedirs(output_dir, exist_ok=True)
    
    # Step 1: Render the page ONCE at 1.0x scale (which will be Zoom 5)
    t0 = time.time()
    print("Rendering PDF page at 1.0x scale (this may take a few minutes)...")
    matrix = fitz.Matrix(1.0, 1.0)
    pix = page.get_pixmap(matrix=matrix)
    print(f"Page rendered to pixmap in {time.time() - t0:.2f} seconds.")
    
    t0 = time.time()
    print("Converting pixmap to PIL Image...")
    # Convert pixmap to PIL Image
    img_full = Image.frombytes("RGBA" if pix.alpha else "RGB", [pix.width, pix.height], pix.samples)
    pix = None # Free memory
    print(f"Converted to PIL Image in {time.time() - t0:.2f} seconds.")
    
    # Step 2: Generate tiles for each zoom level
    for z in range(max_zoom + 1):
        t_z = time.time()
        # Scale relative to 1x scale (zoom 5)
        scale = 2 ** (z - max_zoom)
        
        # Calculate target size
        w = int(round(pdf_w * scale))
        h = int(round(pdf_h * scale))
        
        print(f"\nProcessing Zoom Level {z} (Scale: {scale:.5f}, Target Size: {w}x{h})")
        
        # Resize image if not at max_zoom
        if z == max_zoom:
            img_scaled = img_full
        else:
            t0 = time.time()
            img_scaled = img_full.resize((w, h), Image.Resampling.LANCZOS)
            print(f"  Resized image in {time.time() - t0:.2f} seconds.")
            
        # Create directory for this zoom level
        zoom_dir = os.path.join(output_dir, str(z))
        os.makedirs(zoom_dir, exist_ok=True)
        
        # Calculate tile grid
        cols = math.ceil(w / tile_size)
        rows = math.ceil(h / tile_size)
        print(f"  Grid: {cols} columns x {rows} rows (Total: {cols * rows} tiles)")
        
        # Crop and save tiles
        t0 = time.time()
        for x in range(cols):
            for y in range(rows):
                # Bounds for cropping
                x0 = x * tile_size
                y0 = y * tile_size
                x1 = min((x + 1) * tile_size, w)
                y1 = min((y + 1) * tile_size, h)
                
                # Crop
                tile = img_scaled.crop((x0, y0, x1, y1))
                
                # Create a 256x256 transparent image and paste the cropped tile into it
                tile_padded = Image.new("RGBA", (tile_size, tile_size), (0, 0, 0, 0))
                tile_padded.paste(tile, (0, 0))
                
                # Save as WebP
                tile_path = os.path.join(zoom_dir, f"{x}_{y}.webp")
                tile_padded.save(tile_path, "WEBP", quality=80)
                
        # Clean up scaled image if it's a copy
        if z != max_zoom:
            img_scaled = None
            
        print(f"  Generated {cols * rows} tiles in {time.time() - t0:.2f} seconds.")
        
    img_full = None
    elapsed = time.time() - t_start
    print("\n" + "="*60)
    print(f"SUCCESS: Tile generation complete in {elapsed/60:.2f} minutes!")
    print("="*60)

if __name__ == "__main__":
    pdf_path = "Finished Reports-Map-Videos/3. Giga Mapping (2).pdf"
    generate_tiles(pdf_path)
