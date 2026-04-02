"""CSS design system + HTML head/tail for the NuvoVet slide deck."""

FONTS = """<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"/>"""

CSS = """
:root {
  --bg: #0a0a14; --s1: #12121e; --s2: #1a1a2e; --s3: #242438;
  --border: rgba(255,255,255,0.06); --card-bg: rgba(255,255,255,0.03);
  --t1: #e8e8e6; --t2: #94a3b8; --t3: #64748b;
  --indigo: #6366f1; --emerald: #10b981; --blue: #3b82f6;
  --amber: #f59e0b; --red: #ef4444;
  --slide-w: 1920px; --slide-h: 1080px;
}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--bg);color:var(--t1);font-family:'Pretendard Variable',Pretendard,'DM Sans',system-ui,sans-serif;font-size:16px;line-height:1.7;}
.slide{width:var(--slide-w);height:var(--slide-h);position:relative;overflow:hidden;background:var(--bg);padding:72px 88px;display:flex;flex-direction:column;page-break-after:always;page-break-inside:avoid;}
.slide:last-child{page-break-after:auto;}

/* Typography */
.mono{font-family:'JetBrains Mono',monospace;}
.dm{font-family:'DM Sans',sans-serif;}
h1{font-family:'DM Sans',sans-serif;font-size:54px;font-weight:700;line-height:1.1;letter-spacing:-0.02em;color:var(--t1);}
h2{font-family:'DM Sans',sans-serif;font-size:36px;font-weight:600;line-height:1.2;letter-spacing:-0.01em;color:var(--t1);}
h3{font-family:'DM Sans',sans-serif;font-size:20px;font-weight:600;color:var(--t1);line-height:1.4;}
.label{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:var(--t3);}
.label-accent{color:var(--indigo);}
.body-text{font-size:15px;color:var(--t2);line-height:1.8;word-break:keep-all;}
.caption{font-size:12px;color:var(--t3);line-height:1.6;}
.stat-num{font-family:'DM Sans',sans-serif;font-size:48px;font-weight:700;line-height:1;}
.stat-sm{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:600;}

/* Glass cards */
.glass{background:var(--card-bg);border:1px solid var(--border);border-radius:16px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);}
.glass-sm{background:var(--card-bg);border:1px solid var(--border);border-radius:10px;}
.glass-highlight{box-shadow:inset 0 1px 0 rgba(255,255,255,0.04);}

/* Gradient orbs */
.orb{position:absolute;border-radius:50%;filter:blur(120px);pointer-events:none;opacity:0.5;}
.orb-indigo{background:radial-gradient(circle,rgba(99,102,241,0.3),transparent 70%);}
.orb-blue{background:radial-gradient(circle,rgba(59,130,246,0.25),transparent 70%);}
.orb-red{background:radial-gradient(circle,rgba(239,68,68,0.3),transparent 70%);}
.orb-emerald{background:radial-gradient(circle,rgba(16,185,129,0.2),transparent 70%);}
.orb-amber{background:radial-gradient(circle,rgba(245,158,11,0.2),transparent 70%);}

/* Dot grid */
.dot-grid{background-image:radial-gradient(circle,rgba(255,255,255,0.03) 1px,transparent 1px);background-size:24px 24px;}

/* Badges */
.badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:500;font-family:'JetBrains Mono',monospace;}
.badge-indigo{background:rgba(99,102,241,0.12);color:#818cf8;border:1px solid rgba(99,102,241,0.2);}
.badge-emerald{background:rgba(16,185,129,0.12);color:#34d399;border:1px solid rgba(16,185,129,0.2);}
.badge-blue{background:rgba(59,130,246,0.12);color:#60a5fa;border:1px solid rgba(59,130,246,0.2);}
.badge-amber{background:rgba(245,158,11,0.12);color:#fbbf24;border:1px solid rgba(245,158,11,0.2);}
.badge-red{background:rgba(239,68,68,0.12);color:#f87171;border:1px solid rgba(239,68,68,0.2);}

/* Dots for tables */
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;vertical-align:middle;margin-right:6px;}
.dot-g{background:var(--emerald);}
.dot-a{background:var(--amber);}
.dot-r{background:var(--red);}

/* Table */
.tbl{width:100%;border-collapse:collapse;font-size:13px;}
.tbl th{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--t3);padding:12px 14px;text-align:left;border-bottom:1px solid var(--border);background:var(--s1);}
.tbl td{padding:12px 14px;border-bottom:1px solid var(--border);color:var(--t2);vertical-align:top;line-height:1.5;}
.tbl .co{font-weight:600;color:var(--t1);font-size:13px;}

/* Flex helpers */
.row{display:flex;gap:24px;align-items:stretch;}
.col{display:flex;flex-direction:column;}
.grow{flex:1;}
.center{display:flex;align-items:center;justify-content:center;}
.between{display:flex;justify-content:space-between;align-items:center;}
.wrap{display:flex;flex-wrap:wrap;gap:12px;}
.gap-sm{gap:12px;}.gap-md{gap:20px;}.gap-lg{gap:32px;}
.mt-auto{margin-top:auto;}
.mb-auto{margin-bottom:auto;}
.mt-sm{margin-top:12px;}.mt-md{margin-top:24px;}.mt-lg{margin-top:40px;}
.mb-sm{margin-bottom:12px;}.mb-md{margin-bottom:24px;}

/* Accent borders */
.border-l-indigo{border-left:3px solid var(--indigo);}
.border-l-emerald{border-left:3px solid var(--emerald);}
.border-l-blue{border-left:3px solid var(--blue);}
.border-l-amber{border-left:3px solid var(--amber);}
.border-l-red{border-left:3px solid var(--red);}
.border-t-indigo{border-top:3px solid var(--indigo);}
.border-t-emerald{border-top:3px solid var(--emerald);}
.border-t-blue{border-top:3px solid var(--blue);}
.border-t-amber{border-top:3px solid var(--amber);}

/* Callout */
.callout{padding:16px 20px;border-radius:10px;}
.callout-red{background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);}
.callout-amber{background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);}
.callout-indigo{background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);}
.callout-emerald{background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);}

/* Device frame */
.device{background:var(--s1);border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.04);}
.device-bar{height:32px;background:var(--s1);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 14px;gap:6px;}
.device-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.08);}
.device-body{padding:20px;background:var(--bg);}

/* 3D perspective */
.perspective{perspective:1200px;}
.tilt-l{transform:rotateY(4deg) rotateX(2deg);}
.tilt-r{transform:rotateY(-4deg) rotateX(2deg);}

/* Pipeline */
.pipe-node{display:flex;align-items:center;gap:12px;}
.pipe-arrow{color:var(--t3);font-size:18px;}
.pipe-box{padding:10px 16px;border-radius:10px;background:var(--s1);border:1px solid var(--border);font-size:12px;color:var(--t2);text-align:center;min-width:100px;}

/* Timeline */
.timeline{display:flex;align-items:flex-start;position:relative;gap:0;}
.timeline::before{content:'';position:absolute;top:15px;left:0;right:0;height:2px;background:var(--border);}
.tl-node{flex:1;display:flex;flex-direction:column;align-items:center;position:relative;z-index:1;}
.tl-dot{width:14px;height:14px;border-radius:50%;border:2px solid var(--indigo);background:var(--bg);margin-bottom:12px;}
.tl-dot.active{background:var(--indigo);}

/* Concentric circles */
.conc{position:relative;width:320px;height:320px;}
.conc-ring{position:absolute;border-radius:50%;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;}

/* Bar chart */
.bar-track{height:28px;background:var(--s1);border-radius:6px;overflow:hidden;position:relative;}
.bar-fill{height:100%;border-radius:6px;display:flex;align-items:center;padding-left:10px;font-size:11px;font-weight:600;color:rgba(255,255,255,0.9);}

/* Slide number */
.slide-num{position:absolute;bottom:28px;right:40px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--t3);letter-spacing:0.1em;}
.slide-tag{position:absolute;top:32px;right:40px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--t3);letter-spacing:0.12em;text-transform:uppercase;}

/* Icon container */
.icon-box{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.icon-box svg{width:22px;height:22px;}
.icon-box-indigo{background:rgba(99,102,241,0.12);color:#818cf8;}
.icon-box-emerald{background:rgba(16,185,129,0.12);color:#34d399;}
.icon-box-blue{background:rgba(59,130,246,0.12);color:#60a5fa;}
.icon-box-amber{background:rgba(245,158,11,0.12);color:#fbbf24;}
.icon-box-red{background:rgba(239,68,68,0.12);color:#f87171;}

/* Print */
@media print{
  @page{size:1920px 1080px landscape;margin:0;}
  body{background:var(--bg);}
  .slide{page-break-after:always;page-break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .slide:last-child{page-break-after:auto;}
}
"""

# ── SVG Icons (Lucide-style, 24x24, stroke) ──
ICONS = {
    'shield': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
    'pill': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z"/><path d="m8.5 8.5 7 7"/></svg>',
    'heart': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    'brain': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M12 5v13"/></svg>',
    'alert': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    'clock': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'search': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    'database': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>',
    'users': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    'trending': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
    'file': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 13h4"/><path d="M10 17h4"/></svg>',
    'zap': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>',
    'check': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
    'x-circle': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
    'activity': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    'lock': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    'dollar': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    'git': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>',
    'stethoscope': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>',
    'arrow-right': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
    'paw': '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>',
}

def icon(name, size=24):
    svg = ICONS.get(name, '')
    if size != 24:
        svg = svg.replace('width="24"', f'width="{size}"').replace('height="24"', f'height="{size}"')
    return svg

def html_head():
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NUVOVET — 군 창업 경진대회 발표자료</title>
{FONTS}
<style>{CSS}</style>
</head>
<body>
"""

def html_tail():
    return "</body>\n</html>"
