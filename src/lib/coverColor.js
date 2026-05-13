'use client';

// Extract a dominant color from a book cover URL and derive a 3-tone palette
// { color, spine, cover } that matches the same shape as bookColors().
//
// We pipe through /api/cover-proxy so Kakao/Naver CDN images can be drawn into
// a canvas without tainting it. Results are cached in localStorage keyed by
// the original URL, so a book only pays the cost once per browser.

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
  catch { return null; } // tainted

  // Two-pass: prefer saturated mids; fall back to any non-extreme color.
  const buckets = new Map();
  const fallback = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 200) continue;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    // Bucket key: 5 bits per channel.
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

    const addTo = (map) => {
      const e = map.get(key) || { c: 0, r: 0, g: 0, b: 0 };
      e.c++; e.r += r; e.g += g; e.b += b;
      map.set(key, e);
    };

    // Strict: skip near-white, near-black, low-sat.
    if (max >= 30 && min <= 230 && max - min >= 30) addTo(buckets);
    // Loose: only skip pure white/black.
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
