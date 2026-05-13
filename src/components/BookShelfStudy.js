'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bookColors } from '@/lib/bookColors';
import { extractCoverColors, getCachedCoverColors, textOn } from '@/lib/coverColor';

const WIDTHS = [44, 40, 48, 42, 46, 38];
const HEIGHTS = [228, 218, 238, 222, 212, 232];

function PlaqueCorner({ pos }) {
  const map = {
    tl: { top: 4, left: 4 },
    tr: { top: 4, right: 4 },
    bl: { bottom: 4, left: 4 },
    br: { bottom: 4, right: 4 },
  };
  return <span className="dd-plaque-pin" style={map[pos]} aria-hidden="true" />;
}

function useExtractedColors(books) {
  const [map, setMap] = useState(() => {
    const seed = {};
    for (const b of books) {
      if (b?.cover) {
        const cached = getCachedCoverColors(b.cover);
        if (cached) seed[b.cover] = cached;
      }
    }
    return seed;
  });

  useEffect(() => {
    let cancelled = false;
    const urls = books
      .map((b) => b?.cover)
      .filter((u) => u && !map[u]);
    if (urls.length === 0) return;
    const unique = Array.from(new Set(urls));
    (async () => {
      for (const url of unique) {
        const palette = await extractCoverColors(url);
        if (cancelled || !palette) continue;
        setMap((prev) => (prev[url] ? prev : { ...prev, [url]: palette }));
      }
    })();
    return () => { cancelled = true; };
  }, [books, map]);

  return map;
}

export default function BookShelfStudy({ books = [], perRow = 6 }) {
  const router = useRouter();
  const extracted = useExtractedColors(books);
  if (!books.length) return null;

  const rows = [];
  for (let i = 0; i < books.length; i += perRow) {
    rows.push(books.slice(i, i + perRow));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {rows.map((row, r) => {
        const years = row.map((b) => Number(b.year)).filter((n) => Number.isFinite(n));
        const ymin = years.length ? Math.min(...years) : null;
        const ymax = years.length ? Math.max(...years) : null;
        return (
          <div key={r} className="dd-shelf-row">
            <div className="dd-shelf-books">
              {row.map((b, i) => {
                const palette = (b.cover && extracted[b.cover]) || bookColors(b);
                const text = textOn(palette.color);
                const h = HEIGHTS[(r * perRow + i) % HEIGHTS.length];
                const w = WIDTHS[(r * perRow + i) % WIDTHS.length];
                const year = b.year ?? '';
                return (
                  <button
                    key={b.id}
                    type="button"
                    className="dd-spine"
                    onClick={() => router.push(`/books/${b.id}`)}
                    title={`${b.title}${b.author ? ` — ${b.author}` : ''}${year ? ` (${year})` : ''}`}
                    style={{
                      width: w, height: h,
                      background: `linear-gradient(90deg, ${palette.spine} 0%, ${palette.color} 18%, ${palette.color} 82%, ${palette.spine} 100%)`,
                      '--dd-spine-text': text.strong,
                      '--dd-spine-text-muted': text.muted,
                      '--dd-spine-text-shadow': text.shadow,
                    }}
                  >
                    <div className="dd-spine-title">{b.title}</div>
                    {year ? <div className="dd-spine-year">{year}</div> : <div className="dd-spine-year">&nbsp;</div>}
                  </button>
                );
              })}
              <div className="dd-bookend" aria-hidden="true" />
            </div>

            {years.length > 0 && (
              <div className="dd-plaque">
                <span className="dd-plaque-chain" aria-hidden="true" />
                <div className="dd-plaque-body">
                  <div className="dd-plaque-label">Anno</div>
                  <div className="dd-plaque-year">
                    {ymin === ymax ? ymin : `${ymin}–${ymax}`}
                  </div>
                  <PlaqueCorner pos="tl" />
                  <PlaqueCorner pos="tr" />
                  <PlaqueCorner pos="bl" />
                  <PlaqueCorner pos="br" />
                </div>
              </div>
            )}

            <div className="dd-shelf-board" aria-hidden="true" />
          </div>
        );
      })}
    </div>
  );
}
