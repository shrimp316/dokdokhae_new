'use client';

// 표지 이미지의 대표색으로 bookColors()와 같은 모양의 팔레트를 만든다.
// 카카오·네이버 CDN 이미지는 CORS 헤더가 없어 canvas가 오염되므로 /api/cover-proxy를 거친다.
// 추출 비용이 크니 원본 URL 기준으로 localStorage에 캐시해 브라우저당 한 번만 계산한다.

const CACHE_KEY = 'dd-cover-colors-v1';
const inFlight = new Map();

function loadCache() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}

function saveCache(cache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

const cache = loadCache();

function clamp(n) { return Math.max(0, Math.min(255, Math.round(n))); }

function rgbToHex(r, g, b) {
  return '#' + [clamp(r), clamp(g), clamp(b)]
    .map((v) => v.toString(16).padStart(2, '0')).join('');
}

function adjust(hex, factor) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  return rgbToHex(r * factor, g * factor, b * factor);
}

function dominantFromImage(img) {
  const targetW = 48;
  const ratio = img.naturalHeight / Math.max(1, img.naturalWidth);
  const w = targetW;
  const h = Math.max(1, Math.round(targetW * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  let data;
  try { data = ctx.getImageData(0, 0, w, h).data; }
  catch { return null; } // 프록시를 거치지 않은 이미지는 canvas가 오염돼 읽을 수 없다.

  // 흰 여백·검은 글자가 대표색으로 뽑히지 않도록 채도 있는 중간 톤을 우선하고,
  // 흑백 위주 표지처럼 그런 색이 없을 때만 느슨한 기준으로 돌아간다.
  const buckets = new Map();
  const fallback = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 200) continue;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    // 비슷한 색을 한 묶음으로 세기 위해 채널당 5비트로 양자화한다.
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

    const addTo = (map) => {
      const e = map.get(key) || { c: 0, r: 0, g: 0, b: 0 };
      e.c++; e.r += r; e.g += g; e.b += b;
      map.set(key, e);
    };

    if (max >= 30 && min <= 230 && max - min >= 30) addTo(buckets);
    if (max >= 18 && min <= 240) addTo(fallback);
  }

  const pickBest = (map) => {
    let best = null;
    for (const e of map.values()) {
      if (!best || e.c > best.c) best = e;
    }
    return best;
  };

  const best = pickBest(buckets) || pickBest(fallback);
  if (!best) return null;
  return rgbToHex(best.r / best.c, best.g / best.c, best.b / best.c);
}

function paletteFromHex(hex) {
  return {
    color: hex,
    spine: adjust(hex, 0.62),
    cover: adjust(hex, 1.15),
  };
}

// 베이지·노랑·파스텔처럼 밝은 표지에서 책등 제목이 묻히지 않도록
// WCAG 상대 휘도로 흰 글자와 검은 글자 중 하나를 고른다.
export function textOn(hex) {
  const light = {
    strong: 'rgba(255,255,255,.96)',
    muted: 'rgba(255,255,255,.58)',
    shadow: '0 1px 1px rgba(0,0,0,.22)',
  };
  if (!hex || hex[0] !== '#' || hex.length !== 7) return light;
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return light;
  const toLin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLin((n >> 16) & 0xff);
  const g = toLin((n >> 8) & 0xff);
  const b = toLin(n & 0xff);
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (L > 0.5) {
    return {
      strong: 'rgba(20,15,10,.88)',
      muted: 'rgba(20,15,10,.55)',
      shadow: '0 1px 1px rgba(255,255,255,.35)',
    };
  }
  return light;
}

function proxied(url) {
  return `/api/cover-proxy?url=${encodeURIComponent(url)}`;
}

export function getCachedCoverColors(url) {
  if (!url) return null;
  return cache[url] || null;
}

export function extractCoverColors(url) {
  if (!url) return Promise.resolve(null);
  if (cache[url]) return Promise.resolve(cache[url]);
  if (inFlight.has(url)) return inFlight.get(url);

  const p = new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let settled = false;
    const done = (v) => {
      if (settled) return;
      settled = true;
      inFlight.delete(url);
      resolve(v);
    };
    img.onload = () => {
      const hex = dominantFromImage(img);
      if (!hex) { done(null); return; }
      const palette = paletteFromHex(hex);
      cache[url] = palette;
      saveCache(cache);
      done(palette);
    };
    img.onerror = () => done(null);
    img.src = proxied(url);
  });

  inFlight.set(url, p);
  return p;
}
