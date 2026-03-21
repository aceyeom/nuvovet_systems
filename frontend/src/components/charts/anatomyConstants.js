/**
 * Anatomy Diagram — shared constants, config, and color utilities.
 */
import { getBurdenLevel } from './organBurdenAggregator';

// ── Organ display config ───────────────────────────────────────────
export const ORGAN_LABELS = {
  brain:  { en: 'Brain',  ko: '뇌' },
  heart:  { en: 'Heart',  ko: '심장' },
  liver:  { en: 'Liver',  ko: '간' },
  kidney: { en: 'Kidney', ko: '신장' },
  blood:  { en: 'Blood',  ko: '혈액' },
};

export const LEVEL_LABELS = {
  nodata:   { en: 'No Data',           ko: '데이터 없음', dots: '○○○○○', action: '' },
  none:     { en: 'Routine',           ko: '정상',       dots: '○○○○○', action: '' },
  low:      { en: 'Routine Care',      ko: '일반 관리',  dots: '●○○○○', action: '정기 검진 시 확인' },
  moderate: { en: 'Monitor',           ko: '관찰 필요',  dots: '●●○○○', action: '정기적으로 관련 수치 모니터링 권장' },
  high:     { en: 'Close Monitoring',  ko: '주의 관찰',  dots: '●●●●○', action: '처방 기간 중 해당 장기 기능 검사 권장' },
  critical: { en: 'Intensive Monitor', ko: '집중 관찰',  dots: '●●●●●', action: '투약 전후 해당 장기 기능 검사 필수' },
};

// Blue intensity scale — lightest to deepest navy
export const LEVEL_COLORS = {
  nodata:   'text-slate-400',
  none:     'text-slate-500',
  low:      'text-blue-400',
  moderate: 'text-blue-500',
  high:     'text-blue-700',
  critical: 'text-blue-900',
};

// ── SVG anatomy overlays (pixel coordinates in species canvas) ─────
export const ANATOMY_IMAGE_CONFIG = {
  dog: {
    src: '/anatomy/dog-traced.svg',
    alt: 'Dog traced anatomy silhouette',
    width: 485,
    height: 385,
    mdr1: { x: 0.185, y: 0.24 },
    sections: {
      brain:  { type: 'path', d: 'M 82 84 C 86 74, 96 70, 106 73 C 114 76, 118 84, 116 93 C 114 100, 107 105, 99 106 C 93 106, 88 103, 85 98 C 81 96, 79 91, 82 84 Z' },
      heart:  { type: 'path', d: 'M 140 170 C 146 161, 158 160, 164 168 C 168 173, 168 179, 165 185 C 161 192, 155 196, 148 196 C 142 196, 136 192, 133 185 C 131 179, 133 173, 140 170 Z' },
      liver:  { type: 'path', d: 'M 190 178 C 206 168, 232 167, 248 175 C 255 179, 257 188, 253 196 C 248 205, 236 210, 222 211 C 209 212, 197 207, 190 200 C 184 194, 183 185, 190 178 Z' },
      kidney: { type: 'path', d: 'M 271 175 C 278 169, 288 168, 296 172 C 303 175, 308 182, 308 190 C 308 198, 303 204, 296 208 C 288 212, 278 211, 271 207 C 264 202, 261 195, 262 188 C 263 182, 266 178, 271 175 Z' },
      blood:  { type: 'line', d: 'M 101 92 C 115 95, 126 104, 134 118 C 151 143, 184 152, 224 154 C 265 156, 307 154, 347 157 C 369 160, 388 167, 403 177', strokeWidth: 10, hitWidth: 28 },
    },
    labelAnchors: {
      brain:  { x: 50,  y: 52,  organCx: 98,  organCy: 88 },
      heart:  { x: 105, y: 230, organCx: 148, organCy: 180 },
      liver:  { x: 280, y: 230, organCx: 222, organCy: 192 },
      kidney: { x: 340, y: 160, organCx: 286, organCy: 190 },
      blood:  { x: 390, y: 218, organCx: 346, organCy: 160 },
    },
  },
  cat: {
    src: '/anatomy/cat-traced.svg',
    alt: 'Cat traced anatomy silhouette',
    width: 379,
    height: 199,
    mdr1: { x: 0.18, y: 0.245 },
    sections: {
      brain:  { type: 'path', d: 'M 55 44 C 58 37, 66 34, 74 36 C 81 38, 85 44, 83 51 C 81 57, 76 61, 70 62 C 66 62, 62 60, 59 56 C 56 55, 53 50, 55 44 Z' },
      heart:  { type: 'path', d: 'M 112 96 C 116 89, 126 88, 131 95 C 134 99, 134 105, 132 110 C 129 116, 124 119, 118 120 C 113 120, 108 116, 106 110 C 104 105, 106 99, 112 96 Z' },
      liver:  { type: 'path', d: 'M 149 100 C 163 93, 183 93, 196 99 C 201 102, 203 108, 200 114 C 196 121, 185 125, 174 126 C 163 126, 153 122, 148 116 C 143 111, 143 105, 149 100 Z' },
      kidney: { type: 'path', d: 'M 213 98 C 219 93, 227 92, 234 95 C 240 98, 244 104, 244 110 C 244 117, 240 122, 234 125 C 228 128, 219 127, 213 123 C 208 119, 205 113, 206 107 C 207 102, 209 99, 213 98 Z' },
      blood:  { type: 'line', d: 'M 74 49 C 85 51, 94 56, 101 64 C 113 76, 138 82, 168 84 C 198 86, 226 88, 253 92 C 276 95, 295 101, 312 112', strokeWidth: 7, hitWidth: 20 },
    },
    labelAnchors: {
      brain:  { x: 40,  y: 25,  organCx: 69,  organCy: 48 },
      heart:  { x: 82,  y: 140, organCx: 118, organCy: 106 },
      liver:  { x: 210, y: 142, organCx: 174, organCy: 112 },
      kidney: { x: 270, y: 88,  organCx: 228, organCy: 110 },
      blood:  { x: 296, y: 134, organCx: 246, organCy: 102 },
    },
  },
};

export const HEAT_ORGANS = ['brain', 'heart', 'liver', 'kidney', 'blood'];
export const ORGAN_RENDER_ORDER = ['brain', 'heart', 'liver', 'kidney', 'blood'];

// ── Blue intensity color scale ────────────────────────────────────
export function getSeverityHex(score) {
  const level = getBurdenLevel(score);
  if (level === 'nodata') return '#cbd5e1';   // slate-200
  if (level === 'none') return '#94a3b8';      // slate-400
  if (level === 'low') return '#93c5fd';       // blue-300
  if (level === 'moderate') return '#3b82f6';  // blue-500
  if (level === 'high') return '#1d4ed8';      // blue-700
  return '#1e3a5f';                            // deep navy
}

export function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
    return `rgba(148, 163, 184, ${alpha})`;
  }
  const raw = hex.replace('#', '');
  const full = raw.length === 3
    ? raw.split('').map((c) => c + c).join('')
    : raw;

  if (full.length !== 6) {
    return `rgba(148, 163, 184, ${alpha})`;
  }

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getSectionFill(score) {
  if (score == null) return 'rgba(148, 163, 184, 0.16)';
  const level = getBurdenLevel(score);
  const alpha = level === 'none' ? 0.22 : level === 'low' ? 0.32 : level === 'moderate' ? 0.44 : level === 'high' ? 0.54 : 0.62;
  return hexToRgba(getSeverityHex(score), alpha);
}

export function getSectionStroke(score, hovered) {
  if (hovered) return '#1e293b';
  if (score == null) return '#94a3b8';
  return '#475569';
}

export function getOrganDotColor(score) {
  if (score == null) return '#e2e8f0';
  const level = getBurdenLevel(score);
  if (level === 'none') return '#cbd5e1';
  if (level === 'low') return '#93c5fd';      // blue-300
  if (level === 'moderate') return '#3b82f6';  // blue-500
  if (level === 'high') return '#1d4ed8';      // blue-700
  return '#1e3a5f';                            // deep navy
}
