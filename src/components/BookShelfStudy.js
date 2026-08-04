'use client';
import { useRouter } from 'next/navigation';
import { bookColors } from '@/lib/bookColors';

function BookCover({ book }) {
  const hasImg = book.cover && /^https?:\/\//.test(book.cover);
  if (hasImg) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={book.cover} alt={book.title} loading="lazy" />;
  }
  const c = bookColors(book);
  return (
    <div
      className="dd-book-cover-fallback"
      style={{
        background: `linear-gradient(160deg, ${c.cover} 0%, ${c.color} 60%, ${c.spine} 100%)`,
      }}
    >
      <div className="dd-book-cover-fallback-title">{book.title}</div>
    </div>
  );
}

export default function BookShelfStudy({ books = [], perRow = 6 }) {
  const router = useRouter();
  if (!books.length) return null;

  const rows = [];
  for (let i = 0; i < books.length; i += perRow) {
    rows.push(books.slice(i, i + perRow));
  }

  return (
    <div>
      {rows.map((row, r) => {
        const years = row.map((b) => Number(b.year)).filter((n) => Number.isFinite(n));
        const ymin = years.length ? Math.min(...years) : null;
        const ymax = years.length ? Math.max(...years) : null;
        const yearLabel =
          ymin == null ? null : ymin === ymax ? `${ymin}` : `${ymin}–${ymax}`;
        return (
          <section key={r} className="dd-book-section">
            {yearLabel && (
              <div className="dd-book-section-head">
                <span className="dd-book-section-year">{yearLabel}</span>
                <span className="dd-book-section-rule" aria-hidden="true" />
              </div>
            )}
            <div className="dd-book-grid">
              {row.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="dd-book-card"
                  onClick={() => router.push(`/books/${b.id}`)}
                  title={`${b.title}${b.author ? ` — ${b.author}` : ''}${b.year ? ` (${b.year})` : ''}`}
                >
                  <div className="dd-book-cover">
                    <BookCover book={b} />
                  </div>
                  <div className="dd-book-meta">
                    <span className="dd-book-title">{b.title}</span>
                    {(b.author || b.year) && (
                      <span className="dd-book-author">
                        {[b.author, b.year].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
