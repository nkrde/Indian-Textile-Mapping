with open(r"C:\Users\lcppd\.gemini\antigravity\brain\a653b663-2dc0-437d-8eb6-8ba67d518912\.system_generated\steps\44\content.md", "r", encoding="utf-8") as f:
    lines = f.readlines()

keywords = ["svg", "json", "map.js", "bundle.js", "http", "api", "container", "data"]
for idx, line in enumerate(lines):
    for kw in keywords:
        if kw in line.lower():
            # Only print if it seems like a file path or a script loading something
            if any(ext in line for ext in [".svg", ".json", ".js", "url", "src", "href"]):
                print(f"Line {idx+1}: {line.strip()[:120]}")
                break
