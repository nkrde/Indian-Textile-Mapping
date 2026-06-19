import json

def find_bookmarks(json_path, out_text_path):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    blocks = data["blocks"]
    
    for b in blocks:
        b["height"] = b["y1"] - b["y0"]
        b["width"] = b["x1"] - b["x0"]
        
    sorted_by_height = sorted(blocks, key=lambda x: x["height"], reverse=True)
    
    with open(out_text_path, "w", encoding="utf-8") as out_f:
        out_f.write(f"Total blocks: {len(blocks)}\n\n")
        out_f.write("--- Potential Headings (sorted by font box height) ---\n")
        for idx, b in enumerate(sorted_by_height[:50]):
            text_clean = b['text'].replace('\n', ' ')
            out_f.write(f"Rank {idx+1}: text='{text_clean}', height={b['height']:.1f}, width={b['width']:.1f}, coords=({b['cx']}, {b['cy']})\n")
            
        keywords = ["waste", "textile", "collection", "sorting", "recycling", "landfill", "industry", "sunhari", "devi", "namtech", "kasez", "import"]
        out_f.write("\n--- Keyword Matches ---\n")
        for kw in keywords:
            matches = [b for b in blocks if kw in b["text"].lower()]
            out_f.write(f"Keyword '{kw}': found {len(matches)} matches\n")
            for m in matches[:10]:
                text_clean = m['text'].replace('\n', ' ')
                out_f.write(f"  Match: '{text_clean}' at ({m['cx']}, {m['cy']})\n")

    print(f"Results written to: {out_text_path}")

if __name__ == "__main__":
    find_bookmarks("map_text_index.json", "bookmarks_analysis.txt")
