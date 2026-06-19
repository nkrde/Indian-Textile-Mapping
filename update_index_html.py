import re

def update_index_html(filepath):
    print(f"Updating titles in {filepath}...")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Replacements
    # 1. <title>
    content_updated = content.replace(
        '<title>KASEZ Circular Textile System Hub - World Class Interactive Viewer</title>',
        '<title>Redefining Waste: Circular Textile System Hub - World Class Interactive Viewer</title>'
    )
    
    # 2. Main Header Logo
    content_updated = content_updated.replace(
        '<h1>KASEZ Circular Textile</h1>\n                        <p class="subtitle">Systemic Design & Value Chain Mapping</p>',
        '<h1>Circular Textile Systems</h1>\n                        <p class="subtitle">Redefining Waste: Value Chain Mapping</p>'
    )
    
    # 3. Sidebar About Map Heading
    content_updated = content_updated.replace(
        '<h3>KASEZ Textile Waste Map</h3>',
        '<h3>Redefining Waste: Circular Textile Waste Map</h3>'
    )
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content_updated)
    print("Update complete!")

if __name__ == "__main__":
    update_index_html("index.html")
