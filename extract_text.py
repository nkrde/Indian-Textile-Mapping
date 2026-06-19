import fitz
import json
import os

def extract_pdf_text_with_coords(filepath, out_json_path):
    print(f"Opening PDF for text extraction: {filepath}")
    doc = fitz.open(filepath)
    page = doc[0]
    
    # Extract blocks
    # Each block is a tuple: (x0, y0, x1, y1, "text", block_no, block_type)
    blocks = page.get_text("blocks")
    print(f"Extracted {len(blocks)} text blocks.")
    
    text_data = []
    for b in blocks:
        x0, y0, x1, y1, text, block_no, block_type = b
        # Only process text blocks (block_type 0 is text, 1 is image)
        if block_type == 0:
            cleaned_text = text.strip()
            if cleaned_text:
                text_data.append({
                    "text": cleaned_text,
                    "x0": round(x0, 1),
                    "y0": round(y0, 1),
                    "x1": round(x1, 1),
                    "y1": round(y1, 1),
                    "cx": round((x0 + x1) / 2, 1),
                    "cy": round((y0 + y1) / 2, 1)
                })
                
    # Also extract individual words for finer search/highlighting if needed
    words = page.get_text("words")
    print(f"Extracted {len(words)} individual words.")
    
    word_data = []
    for w in words:
        x0, y0, x1, y1, word, block_no, line_no, word_no = w
        word_data.append({
            "word": word,
            "x0": round(x0, 1),
            "y0": round(y0, 1),
            "x1": round(x1, 1),
            "y1": round(y1, 1)
        })
        
    output_data = {
        "width": page.rect.width,
        "height": page.rect.height,
        "blocks": text_data,
        "words": word_data
    }
    
    with open(out_json_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
        
    print(f"Text index saved to: {out_json_path}")
    print(f"JSON file size: {os.path.getsize(out_json_path) / (1024*1024):.2f} MB")

if __name__ == "__main__":
    extract_pdf_text_with_coords("Finished Reports-Map-Videos/3. Giga Mapping (2)_compressed.pdf", "map_text_index.json")
