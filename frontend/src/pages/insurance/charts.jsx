import React from 'react';

export const Sparkline = ({ data, w = 120, h = 28, color = '#1A1A1A', area = false }) => {
  if (!data || !data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = Math.max(max - min, 1);
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 4) - 2]);
  const pathD = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const areaD = pathD + ` L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="spark">
      {area && <path d={areaD} fill={color} opacity="0.08" />}
      <path d={pathD} stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

export const StackedBarChart = ({ data, w = 700, h = 260 }) => {
  const max = Math.max(...data.map(d => d.total));
  const padL = 8, padR = 12, padT = 12, padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const barCount = data.length;
  const bw = (innerW / barCount) * 0.7;
  const gap = (innerW / barCount) * 0.3;
  const yticks = 4;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {[...Array(yticks + 1)].map((_, i) => {
        const y = padT + (innerH / yticks) * i;
        const val = Math.round((max / yticks) * (yticks - i) / 50) * 50;
        return (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="#F0F0F0" strokeWidth="1" />
            <text x={w - padR} y={y - 4} fontSize="10" fill="#999" textAnchor="end" fontFamily="JetBrains Mono, monospace">{val}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const totalH = (d.total / max) * innerH;
        const flagH = (d.flagged / max) * innerH;
        const normalH = totalH - flagH;
        const x = padL + i * (bw + gap) + gap / 2;
        const yNormal = padT + innerH - totalH;
        const yFlag = padT + innerH - flagH;
        return (
          <g key={i}>
            <rect x={x} y={yNormal} width={bw} height={normalH} fill="#D4D4D4" />
            <rect x={x} y={yFlag} width={bw} height={flagH} fill="#B91C1C" opacity="0.85" />
            <text x={x + bw / 2} y={h - 8} fontSize="10" fill="#999" textAnchor="middle" fontFamily="JetBrains Mono, monospace">{d.w}</text>
          </g>
        );
      })}
    </svg>
  );
};

export const HorizontalBars = ({ data, w = 480, h = 280, valueKey = 'amt', labelKey = 'name', max, riskKey }) => {
  const _max = max || Math.max(...data.map(d => d[valueKey]));
  const rowH = h / data.length;
  const labelW = 200;
  const padR = 80;
  const barW = w - labelW - padR;

  const colorFor = (risk) => {
    if (risk == null) return '#0F766E';
    if (risk >= 60) return '#B91C1C';
    if (risk >= 40) return '#B45309';
    return '#A3A3A3';
  };

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
      {data.map((d, i) => {
        const y = i * rowH + 2;
        const bh = rowH - 6;
        const bl = (d[valueKey] / _max) * barW;
        return (
          <g key={i}>
            <text x={labelW - 12} y={y + bh / 2 + 4} fontSize="11" fill="#1A1A1A" textAnchor="end">{d[labelKey].length > 22 ? d[labelKey].slice(0, 22) + '…' : d[labelKey]}</text>
            <rect x={labelW} y={y} width={bl} height={bh} fill={colorFor(d[riskKey])} opacity={d[riskKey] >= 60 ? 0.85 : 0.7} />
            <text x={labelW + bl + 8} y={y + bh / 2 + 4} fontSize="11" fill="#666" fontFamily="JetBrains Mono, monospace">₩{(d[valueKey] / 1000).toFixed(0)}M</text>
          </g>
        );
      })}
    </svg>
  );
};

export const TrendCompare = ({ a, b, w = 560, h = 200, labels }) => {
  const all = [...a, ...b];
  const max = Math.max(...all);
  const min = Math.min(...all) * 0.92;
  const range = max - min;
  const padL = 32, padR = 12, padT = 16, padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const step = innerW / (a.length - 1);
  const toPath = (d) => d.map((v, i) => (i === 0 ? 'M' : 'L') + (padL + i * step).toFixed(1) + ',' + (padT + innerH - ((v - min) / range) * innerH).toFixed(1)).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
      {[0, 1, 2, 3].map(i => {
        const y = padT + (innerH / 3) * i;
        return <line key={i} x1={padL} x2={w - padR} y1={y} y2={y} stroke="#F0F0F0" />;
      })}
      <path d={toPath(b)} stroke="#A3A3A3" strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
      <path d={toPath(a)} stroke="#0F766E" strokeWidth="2" fill="none" strokeLinejoin="round" />
      {labels && labels.map((lab, i) => (
        <text key={i} x={padL + i * step} y={h - 8} fontSize="10" fill="#999" textAnchor="middle" fontFamily="JetBrains Mono, monospace">{lab}</text>
      ))}
    </svg>
  );
};

export const Histogram = ({ data, w = 560, h = 200, marks = [] }) => {
  const max = Math.max(...data);
  const padL = 8, padR = 12, padT = 16, padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const bw = innerW / data.length;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
      {data.map((v, i) => {
        const bh = (v / max) * innerH;
        return (
          <rect key={i}
            x={padL + i * bw + 0.5}
            y={padT + innerH - bh}
            width={bw - 1}
            height={bh}
            fill="#0F766E"
            opacity="0.7"
          />
        );
      })}
      {marks.map((m, i) => {
        const x = padL + (m.pos / 100) * innerW;
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={padT} y2={padT + innerH} stroke="#0A0A0A" strokeWidth="1" strokeDasharray="2 2" />
            <text x={x} y={padT - 4} fontSize="10" fill="#0A0A0A" textAnchor="middle" fontWeight="600">{m.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

export const PriceRange = ({ p25, p50, p75, p95, marker, markerColor = '#0F766E', w = 240 }) => {
  const min = p25 * 0.85;
  const max = p95 * 1.05;
  const range = max - min;
  const x = (v) => ((v - min) / range) * 100;
  return (
    <svg width="100%" viewBox={`0 0 100 16`} preserveAspectRatio="none" style={{ width: w, height: 16 }}>
      <rect x="0" y="6" width="100" height="4" fill="#F0F0F0" />
      <rect x={x(p25)} y="6" width={x(p95) - x(p25)} height="4" fill="#D4D4D4" />
      <rect x={x(p50) - 0.4} y="4" width="0.8" height="8" fill="#999" />
      <rect x={x(marker) - 0.6} y="2" width="1.2" height="12" fill={markerColor} />
    </svg>
  );
};

export const RegionBars = ({ data, w = 560, h = 220 }) => {
  const allMax = Math.max(...data.map(d => d.p95));
  const allMin = Math.min(...data.map(d => d.p25)) * 0.9;
  const range = allMax - allMin;
  const labelW = 60;
  const sampleW = 60;
  const innerW = w - labelW - sampleW - 16;
  const rowH = h / data.length;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
      {data.map((d, i) => {
        const y = i * rowH + 4;
        const bh = rowH - 12;
        const x25 = labelW + ((d.p25 - allMin) / range) * innerW;
        const x95 = labelW + ((d.p95 - allMin) / range) * innerW;
        const x50 = labelW + ((d.p50 - allMin) / range) * innerW;
        return (
          <g key={i}>
            <text x={labelW - 8} y={y + bh / 2 + 4} fontSize="11" fill="#1A1A1A" textAnchor="end">{d.region}</text>
            <rect x={x25} y={y + bh / 2 - 2} width={x95 - x25} height="4" fill="#D4D4D4" />
            <rect x={x50 - 1} y={y + bh / 2 - 5} width="2" height="10" fill="#0F766E" />
            <text x={w - sampleW + 8} y={y + bh / 2 + 4} fontSize="10" fill="#999" fontFamily="JetBrains Mono, monospace">n={d.n}</text>
          </g>
        );
      })}
    </svg>
  );
};
