with open("map.svg", "r", encoding="utf-8") as f:
    text = f.read()

# Let's find some path data
import re
paths = re.findall(r'<path[^>]*d="([^"]+)"', text[:500000])
print(f"Found {len(paths)} paths in the first 500KB of SVG.")
for idx, p in enumerate(paths[:5]):
    print(f"Path {idx+1}: {p[:200]}...")
