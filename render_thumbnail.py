import fitz

def render_thumbnail(filepath, out_img_path):
    print(f"Opening PDF: {filepath}")
    doc = fitz.open(filepath)
    page = doc[0]
    
    # We want the thumbnail to be about 800px wide
    # Target width: 800
    # Original width: 30630
    # Zoom factor = 800 / 30630 = 0.0261
    zoom = 800.0 / page.rect.width
    mat = fitz.Matrix(zoom, zoom)
    
    print(f"Rendering thumbnail at zoom={zoom:.4f}...")
    pix = page.get_pixmap(matrix=mat)
    
    print(f"Saving thumbnail to: {out_img_path}")
    pix.save(out_img_path)
    print("Thumbnail render complete!")

if __name__ == "__main__":
    render_thumbnail("Finished Reports-Map-Videos/3. Giga Mapping (2)_compressed.pdf", "map_thumbnail.png")
