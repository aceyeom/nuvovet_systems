#!/usr/bin/env python3
"""
Build script: injects slide fragments into the shell HTML.
Usage: python3 build.py → produces nuvovet_deck.html
"""
import os
from pathlib import Path

DIR = Path(__file__).parent
SHELL = DIR / "index.html"
SLIDES_DIR = DIR / "slides"
OUTPUT = DIR / "nuvovet_deck.html"

def build():
    shell = SHELL.read_text(encoding="utf-8")

    # Collect slide fragments s01..s18
    fragments = []
    for i in range(1, 19):
        f = SLIDES_DIR / f"s{i:02d}.html"
        if f.exists():
            fragments.append(f.read_text(encoding="utf-8"))
        else:
            fragments.append(f'<section class="slide" id="s{i}"><div class="center h-full"><p class="label label-dim">Slide {i} — pending</p></div><span class="slide-num">{i:02d}/18</span></section>')

    slide_html = "\n\n".join(fragments)

    # Inject into shell — replace the comment block inside #presentation-viewport
    marker_start = "<!-- SLIDES WILL BE INJECTED HERE BY CONTENT SCRIPTS -->"
    marker_end = "</div>"  # closing #presentation-viewport

    # Find the viewport div and inject slides
    vp_start = shell.index(marker_start)
    vp_end = shell.index(marker_end, vp_start)

    output = shell[:vp_start] + slide_html + "\n\n" + shell[vp_end:]

    OUTPUT.write_text(output, encoding="utf-8")

    # Report
    existing = [f"s{i:02d}" for i in range(1, 19) if (SLIDES_DIR / f"s{i:02d}.html").exists()]
    missing = [f"s{i:02d}" for i in range(1, 19) if not (SLIDES_DIR / f"s{i:02d}.html").exists()]
    print(f"✓ Built {OUTPUT.name}")
    print(f"  Slides present: {len(existing)}/18 — {', '.join(existing)}")
    if missing:
        print(f"  Missing (placeholder): {', '.join(missing)}")

if __name__ == "__main__":
    build()
