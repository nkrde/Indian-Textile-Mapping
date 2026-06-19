import re

def analyze_svg_distribution(filepath):
    print(f"Analyzing size distribution in {filepath}...")
    
    # Read the file
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    print(f"Total characters: {len(content)}")
    
    # Check length of defs
    defs_match = re.search(r'<defs>(.*?)</defs>', content, re.DOTALL)
    if defs_match:
        print(f"Defs size: {len(defs_match.group(0)) / (1024*1024):.2f} MB")
        
        # What is inside defs?
        defs_content = defs_match.group(1)
        masks = re.findall(r'<mask[^>]*>.*?</mask>', defs_content, re.DOTALL)
        clips = re.findall(r'<clipPath[^>]*>.*?</clipPath>', defs_content, re.DOTALL)
        groups = re.findall(r'<g[^>]*>.*?</g>', defs_content, re.DOTALL)
        
        print(f"  Masks count: {len(masks)}, total size: {sum(len(m) for m in masks) / (1024*1024):.2f} MB")
        print(f"  Clips count: {len(clips)}, total size: {sum(len(c) for c in clips) / (1024*1024):.2f} MB")
        print(f"  Groups count inside defs: {len(groups)}, total size: {sum(len(g) for g in groups) / (1024*1024):.2f} MB")
        
        # Let's see if there are any huge base64 images inside defs or main content
        images = re.findall(r'<image[^>]*>', content)
        print(f"Total <image> tags: {len(images)}")
        images_len = sum(len(img) for img in images)
        print(f"Total size of all <image> tags: {images_len / (1024*1024):.2f} MB")
        
    # Check paths size outside defs
    body_content = content
    if defs_match:
        body_content = content.replace(defs_match.group(0), "")
    
    paths = re.findall(r'<path[^>]*>', body_content)
    print(f"Paths outside defs: {len(paths)}")
    paths_len = sum(len(p) for p in paths)
    print(f"Total size of paths outside defs: {paths_len / (1024*1024):.2f} MB")
    
    # Check if there are other massive elements
    # Let's print out the top 5 largest elements or tags
    all_elements = re.findall(r'<[^>]+>', content)
    sorted_elements = sorted(all_elements, key=len, reverse=True)
    print("\nTop 5 largest elements in the SVG:")
    for idx, el in enumerate(sorted_elements[:5]):
        print(f"Rank {idx+1}: tag='{el[:50]}...', size={len(el) / 1024:.2f} KB")

if __name__ == "__main__":
    analyze_svg_distribution("map.svg")
