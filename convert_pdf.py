import fitz
import os
import time

def convert_to_svg(filepath, out_path):
    print(f"Opening PDF: {filepath}")
    t0 = time.time()
    doc = fitz.open(filepath)
    page = doc[0]
    print(f"Page size: Width={page.rect.width}, Height={page.rect.height}")
    
    print("Extracting page as SVG...")
    svg_text = page.get_svg_image()
    
    print(f"Saving SVG to: {out_path}")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(svg_text)
    
    elapsed = time.time() - t0
    out_size = os.path.getsize(out_path)
    print(f"SVG conversion complete in {elapsed:.2f} seconds!")
    print(f"Output SVG size: {out_size / (1024*1024):.2f} MB")

if __name__ == "__main__":
    convert_to_svg("Finished Reports-Map-Videos/3. Giga Mapping (2)_compressed.pdf", "map.svg")
