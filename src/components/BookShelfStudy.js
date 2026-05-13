'use client';
import { useRouter } from 'next/navigation';
import { bookColors } from '@/lib/bookColors';

// Width / height rotation for spines so the shelf doesn't look uniform.
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

export default function BookShelfStudy({ books = [], perRow = 6 }) {
  const router = useRouter();
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
                const palette = bookColors(b);
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
