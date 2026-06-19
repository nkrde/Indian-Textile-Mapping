import xml.etree.ElementTree as ET
import os

def inspect_svg(filepath):
    print(f"Inspecting SVG: {filepath}")
    size = os.path.getsize(filepath)
    print(f"Size: {size / (1024*1024):.2f} MB")
    
    # We won't parse the whole XML using ElementTree if it is 151MB, as it might exceed memory.
    # Instead, let's scan the file line-by-line or read chunks to find image tags and path tags.
    path_count = 0
    text_count = 0
    image_count = 0
    image_sizes = []
    
    # Let's count some tags
    with open(filepath, "r", encoding="utf-8") as f:
        # Read in blocks
        chunk_size = 1024 * 1024
        buffer = ""
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            buffer += chunk
            
            # Count tags
            path_count += buffer.count("<path")
            text_count += buffer.count("<text")
            
            # Find image tags
            start_idx = 0
            while True:
                idx = buffer.find("<image", start_idx)
                if idx == -1:
                    break
                image_count += 1
                # Try to find the end of the tag
                end_idx = buffer.find(">", idx)
                if end_idx != -1:
                    img_tag = buffer[idx:end_idx+1]
                    # Check size of href attribute if it contains base64
                    href_idx = img_tag.find('href="data:image/')
                    if href_idx != -1:
                        data_start = img_tag.find(',', href_idx)
                        data_end = img_tag.find('"', data_start)
                        if data_start != -1 and data_end != -1:
                            data_len = data_end - data_start
                            image_sizes.append(data_len)
                    start_idx = end_idx
                else:
                    break
            
            # Keep the last 1000 chars of buffer in case tags are split across chunks
            buffer = buffer[-1000:]
            
    print(f"Number of paths: {path_count}")
    print(f"Number of texts: {text_count}")
    print(f"Number of images: {image_count}")
    if image_sizes:
        print(f"Images size total in SVG: {sum(image_sizes) / (1024*1024):.2f} MB")
        print(f"Individual image sizes (top 10): {[s / (1024*1024) for s in sorted(image_sizes, reverse=True)[:10]]} MB")

if __name__ == "__main__":
    inspect_svg("map.svg")
