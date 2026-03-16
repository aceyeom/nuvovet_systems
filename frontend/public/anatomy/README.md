# Anatomy base assets

Place the user-provided outline PNG images here:

- dog-outline.png
- cat-outline.png

Generate traced SVG curves from PNG inputs:

- npm run trace:anatomy (run from frontend/)

Generated files used by the Organ Burden diagram:

- /anatomy/dog-traced.svg
- /anatomy/cat-traced.svg

Recommended PNG source quality:

- Transparent or very light background
- Side-profile full body
- Similar pose to current reference screenshots
- Width >= 1200px for cleaner tracing

The UI renders these SVG assets directly and draws heatmap overlays in the same SVG coordinate system.
