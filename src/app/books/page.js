'use client';
import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import BookShelfStudy from '@/components/BookShelfStudy';

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'books'), orderBy('addedAt', 'desc')));
        if (cancelled) return;
        setBooks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        // empty list
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return books;
    const needle = q.trim().toLowerCase();
    return books.filter((b) => {
      const fields = [b.title, b.author, b.genre].map((s) => (s || '').toLowerCase());
      return fields.some((s) => s.includes(needle));
    });
  }, [books, q]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div
        className="dd-books-head"
        style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: 18, flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11, color: 'var(--dd-text-muted)',
              letterSpacing: '0.3em', textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            The Library
          </div>
          <h1
            style={{
              fontFamily: 'var(--dd-serif)', fontSize: 'var(--dd-h1)',
              fontWeight: 500, margin: 0, color: 'var(--dd-text)',
              letterSpacing: '-0.03em', lineHeight: 1,
            }}
          >
            역대 <em style={{ fontStyle: 'italic', color: 'var(--dd-accent)' }}>도서 목록</em>
          </h1>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="제목 · 저자 · 장르"
          style={{
            padding: '10px 14px', minWidth: 280,
            background: 'transparent',
            border: 0, borderBottom: '1px solid var(--dd-text)',
            fontSize: 13, color: 'var(--dd-text)', outline: 'none',
            fontFamily: 'var(--dd-sans)', borderRadius: 0,
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="empty-msg">등록된 책이 없어요.</p>
      ) : (
        <BookShelfStudy books={filtered} perRow={6} />
      )}
    </div>
  );
}
