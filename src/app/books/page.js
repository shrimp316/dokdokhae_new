'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import { matchAny } from '@/lib/searchUtils';

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    getDocs(query(collection(db, 'books'), orderBy('addedAt', 'desc')))
      .then(snap => setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const filtered = books.filter(b => matchAny([b.title, b.author, b.genre], search));

  return (
    <div>
      <div className="section-title">역대 도서 목록</div>
      <SearchBar
        value={searchInput}
        onChange={setSearchInput}
        onSubmit={v => setSearch(v)}
        placeholder="책 제목, 저자, 장르로 검색…"
      />
      {!filtered.length ? (
        <p className="empty-msg">등록된 책이 없어요.</p>
      ) : (
        <div className="books-grid">
          {filtered.map(b => (
            <div
              key={b.id}
              onClick={() => router.push(`/books/${b.id}`)}
              style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--shadow)', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              {b.cover ? (
                <img src={b.cover} alt={b.title} className="book-card-cover" />
              ) : (
                <div className="book-card-cover no-cover">📚</div>
              )}
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, marginBottom: 3 }}>{b.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.author}</div>
                {b.genre && <div style={{ marginTop: 4 }}><span className="tag">{b.genre}</span></div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
