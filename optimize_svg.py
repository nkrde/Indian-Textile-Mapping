import os
import re
import base64
import time

def optimize_svg(svg_path, output_svg_path, images_dir):
    print(f"Optimizing SVG: {svg_path}")
    t0 = time.time()
    
    if not os.path.exists(images_dir):
        os.makedirs(images_dir)
        print(f"Created directory: {images_dir}")
        
    with open(svg_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    print(f"Original file size: {len(content) / (1024*1024):.2f} MB")
    
    # 1. Extract base64 images
    print("Extracting base64 images...")
    # Find all <image ... href="data:image/[png;jpeg;gif];base64,..." ...>
    # The regex matches href="data:image/XXX;base64,YYY"
    image_pattern = re.compile(r'(<image[^>]*href=")(data:image/([^;]+);base64,([^"]+))("[^>]*>)')
    
    img_counter = 0
    extracted_size = 0
    
    def replace_image(match):
        nonlocal img_counter, extracted_size
        prefix = match.group(1)
        mime_type = match.group(3)
        base64_data = match.group(4)
        suffix = match.group(5)
        
        # Determine file extension
        ext = mime_type
        if ext == "jpeg":
            ext = "jpg"
            
        img_name = f"image_{img_counter}.{ext}"
        img_path = os.path.join(images_dir, img_name)
        
        # Decode base64
        try:
            img_bytes = base64.b64decode(base64_data)
            with open(img_path, "wb") as img_f:
                img_f.write(img_bytes)
            
            img_counter += 1
            extracted_size += len(img_bytes)
            
            # Replace base64 URL with relative path
            # Note: SVG uses forward slashes for URLs
            rel_url = f"images/{img_name}"
            return f'{prefix}{rel_url}{suffix}'
        except Exception as e:
            print(f"Error decoding image {img_counter}: {e}")
            # If fail, keep original
            return match.group(0)
            
    content_opt = image_pattern.sub(replace_image, content)
    print(f"Extracted {img_counter} images. Saved total {extracted_size / (1024*1024):.2f} MB of raw binary data.")
    
    # 2. Round float coordinates in path definitions (d="...")
    print("Rounding coordinates in path data...")
    # A path 'd' attribute contains commands (M, L, C, S, Q, T, A, H, V, Z) followed by numbers.
    # We want to find d="XXX" and replace floats in XXX.
    path_d_pattern = re.compile(r'(\bd=")([^"]+)(")')
    
    # We also want to round transform matrices transform="matrix(a,b,c,d,e,f)"
    transform_pattern = re.compile(r'(\btransform="matrix\()([^\)]+)(\)\")')
    
    float_pattern = re.compile(r'-?\d+\.\d+')
    
    def round_floats(s, precision=1):
        # Find all floats in the string and round them
        def repl(match):
            val = float(match.group(0))
            if precision == 0:
                return str(int(round(val)))
            else:
                return f"{val:.{precision}f}".rstrip('0').rstrip('.')
        return float_pattern.sub(repl, s)
        
    path_counter = 0
    def replace_path_d(match):
        nonlocal path_counter
        path_counter += 1
        d_val = match.group(2)
        # Round floats to 1 decimal place
        d_rounded = round_floats(d_val, 1)
        return f'{match.group(1)}{d_rounded}{match.group(3)}'
        
    content_opt = path_d_pattern.sub(replace_path_d, content_opt)
    print(f"Processed {path_counter} paths.")
    
    transform_counter = 0
    def replace_transform(match):
        nonlocal transform_counter
        transform_counter += 1
        matrix_vals = match.group(2)
        # Round transform floats to 2 decimal places to preserve orientation/matrix math
        matrix_rounded = round_floats(matrix_vals, 2)
        return f'{match.group(1)}{matrix_rounded}{match.group(3)}'
        
    content_opt = transform_pattern.sub(replace_transform, content_opt)
    print(f"Processed {transform_counter} transforms.")
    
    # Write optimized SVG
    print(f"Saving optimized SVG to: {output_svg_path}")
    with open(output_svg_path, "w", encoding="utf-8") as f:
        f.write(content_opt)
        
    elapsed = time.time() - t0
    final_size = os.path.getsize(output_svg_path)
    print(f"Optimization complete in {elapsed:.2f} seconds!")
    print(f"Final SVG size: {final_size / (1024*1024):.2f} MB")
    print(f"Saved { (len(content) - final_size) / (1024*1024):.2f} MB of file size!")

if __name__ == "__main__":
    optimize_svg("map.svg", "map_optimized.svg", "images")
