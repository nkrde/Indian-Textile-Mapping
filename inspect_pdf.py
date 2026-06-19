import os

def inspect_pdf(filepath):
    print(f"Inspecting: {filepath}")
    size = os.path.getsize(filepath)
    print(f"File size: {size / (1024*1024):.2f} MB")
    
    try:
        import pypdf
        reader = pypdf.PdfReader(filepath)
        print(f"Number of pages: {len(reader.pages)}")
        for idx, page in enumerate(reader.pages):
            print(f"Page {idx+1}: Box={page.mediabox}")
    except ImportError:
        print("pypdf is not installed.")
        
    try:
        import fitz # PyMuPDF
        doc = fitz.open(filepath)
        print(f"PyMuPDF Open: Number of pages: {len(doc)}")
        for idx in range(len(doc)):
            page = doc[idx]
            rect = page.rect
            print(f"PyMuPDF Page {idx+1}: Width={rect.width}, Height={rect.height}")
    except ImportError:
        print("PyMuPDF (fitz) is not installed.")

if __name__ == "__main__":
    inspect_pdf("3. Giga Mapping (2).pdf")
