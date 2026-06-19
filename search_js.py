with open(r"C:\Users\lcppd\.gemini\antigravity\brain\a653b663-2dc0-437d-8eb6-8ba67d518912\.system_generated\steps\68\content.md", "r", encoding="utf-8") as f:
    text = f.read()

# Let's search for common zoom/pan library names or function names
keywords = ["svg-pan-zoom", "panzoom", "d3-zoom", "svgPanZoom", "panZoom", "zoom", "pan", "wheel", "mousedown"]
for kw in keywords:
    count = text.lower().count(kw.lower())
    print(f"Keyword '{kw}': found {count} times")
