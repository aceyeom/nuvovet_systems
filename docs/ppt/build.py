#!/usr/bin/env python3
"""
Build script: injects slide fragments into the shell HTML.
Usage:
    python3 build.py          -> build once
    python3 build.py --watch  -> rebuild when deck-related files change
"""
import argparse
import subprocess
import sys
import time
from pathlib import Path

DIR = Path(__file__).parent
SHELL = DIR / "index.html"
SLIDES_DIR = DIR / "slides"
OUTPUT = DIR / "nuvovet_deck.html"
MANIFEST = DIR / "manifest.md"


WATCH_ROOT_GLOBS = (
    "*.py",
    "*.mjs",
    "*.css",
    "*.md",
    "slides/*.html",
)


def iter_inputs():
    yielded = set()

    def emit(path: Path):
        if not path.exists() or path == OUTPUT:
            return
        resolved = path.resolve()
        if resolved in yielded:
            return
        yielded.add(resolved)
        yield path

    for fixed in (SHELL, MANIFEST):
        yield from emit(fixed)

    for pattern in WATCH_ROOT_GLOBS:
        for path in sorted(DIR.glob(pattern)):
            yield from emit(path)


def snapshot_inputs():
    return {
        path: path.stat().st_mtime_ns
        for path in iter_inputs()
        if path.exists()
    }


def run_build_once():
    # Use a new Python process so edits to build.py apply immediately during watch mode.
    result = subprocess.run(
        [sys.executable, str(__file__), "--once"],
        cwd=DIR,
        check=False,
    )
    if result.returncode != 0:
        print(f"Build failed with exit code {result.returncode}")

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


def watch(interval: float = 0.5):
    print("Watching for deck-related file changes...")
    previous_snapshot = snapshot_inputs()
    run_build_once()

    try:
        while True:
            time.sleep(interval)
            current_snapshot = snapshot_inputs()
            if current_snapshot != previous_snapshot:
                run_build_once()
                previous_snapshot = current_snapshot
    except KeyboardInterrupt:
        print("\nStopped watching.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--watch", action="store_true", help="Rebuild when slide files change")
    parser.add_argument("--once", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()

    if args.watch:
        watch()
    elif args.once:
        build()
    else:
        build()
